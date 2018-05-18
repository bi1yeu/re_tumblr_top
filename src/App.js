import React, { Component } from 'react';
import './App.css';

import fetch from 'fetch-retry';
const range = (to, step) =>
  Array.from(new Array(to), (x,i) => i)
       .filter((i) => i % step === 0);

const handleResponse = (response) => {
  if (!response.ok) {
    var errorMessage = 'Something went wrong.'
    if (response.status === 429) {
      errorMessage = 'Too many requests. Please try again later.'
    }
    throw Error(errorMessage);
  } else {
    return response.json();
  }
}

const Post = ({ post }) => {
  return(
    <div>
      <div>{post.title}</div>
      <div>#notes: {post.note_count}</div>
      <div dangerouslySetInnerHTML={{ __html: post.caption }} />
      { post.type === 'photo' ?
        <img alt={post.photos[0].caption || ""}
          width="300"
          src={post.photos[0].alt_sizes[1].url} /> :
        <div dangerouslySetInnerHTML={{ __html: post.body }} />
      }
      <hr />
    </div>
  );
}

class App extends Component {
  constructor(props) {
    super(props);
    this.state = {
      blogName: '',
      blog: {},
      posts: [],
      totalFetchedPosts: 0,
      displayNumPosts: 15,
      error: ''
    };
    this.onChange = this.onChange.bind(this);
    this.onSubmit = this.onSubmit.bind(this);
    this.postIsOriginal = this.postIsOriginal.bind(this);
  }

  shouldComponentUpdate(nextProps, nextState) {
    /* Can only fetch 20 posts at a time, don't want to sort, filter, and
       rerender after every fetch */

    const updateEveryNPosts = 100;

    return this.state.totalFetchedPosts <= 40 ||
           this.state.totalFetchedPosts === nextState.totalFetchedPosts ||
           nextState.totalFetchedPosts % updateEveryNPosts === 0 ||
           nextState.totalFetchedPosts >= this.state.blog.total_posts;
  }

  getPosts() {
    const stepSize = 20;

    range(this.state.blog.total_posts, stepSize)
      .map((offset) => {
        const url = new URL(`https://api.tumblr.com/v2/blog/${this.state.blogName}/posts`);
        const params = {api_key: API_KEY,
                        limit: stepSize,
                        reblog_info: true,
                        offset};
        url.search = new URLSearchParams(params);
        return url;
      })
      .map((url) => {
        const request = fetch(url)
          .then(handleResponse)
          .then(({ response }) => {
            const fetchedPosts = response.posts;
            const filteredPosts = this.state.posts.concat(fetchedPosts);
            this.setState({posts: filteredPosts,
                           totalFetchedPosts: this.state.totalFetchedPosts + fetchedPosts.length});
          })
          .catch(e => this.setState({error: e.message}))
        return request;
      });
  }

  getBlogInfo() {
    const url = new URL(`https://api.tumblr.com/v2/blog/${this.state.blogName}/info`);
    const params = {api_key: API_KEY}
    url.search = new URLSearchParams(params)

    return fetch(url, {
      method: 'GET'
    })
    .then(handleResponse)
    .then(info => this.setState({blog: info.response.blog}))
    .catch(e => this.setState({error: e.message}))
  }

  postIsOriginal(post) {
    if (post === undefined) {
      return false;
    }

    if (post.reblogged_from_id) {
      return false;
    }

    /* Some posts with deleted source blogs don't have a reblogged_from_id; this
       is an attempt to still differentiate those reblogs */
    if (post.trail &&
        post.trail.length > 0 &&
        post.trail[0] &&
        post.trail[0].blog.name !== this.state.blogName.replace(/\.tumblr\.com/, '')) {
      return false;
    }

    /* Others have a reblog tree with links */
    if (post.reblog && post.reblog.tree_html.indexOf('.tumblr.com/') !== -1) {
      return false;
    }

    return true;
  }

  onChange(evt) {
    this.setState({[evt.target.name]: evt.target.value})
  }

  onSubmit(evt) {
    this.setState({blog: {},
                   posts: [],
                   totalFetchedPosts: 0,
                   error: ''});
    if (this.state.blogName.indexOf('.tumblr.com') === -1) {
      this.setState({blogName: this.state.blogName + '.tumblr.com'});
    }
    this.getBlogInfo().then(() => this.getPosts());
    evt.preventDefault();
  }

  render() {
    const posts = this.state.posts
                      .filter(this.postIsOriginal)
                      .sort((a, b) => a.note_count < b.note_count)
                      .slice(0, this.state.displayNumPosts)
                      .map(p => <Post key={p.id} post={p} />);
    return (
      <div className="App">
        <header className="App-header">
          <h1 className="App-title">Tumblr Top</h1>
        </header>
        {
          this.state.error ?
          this.state.error :
          <div />
        }
        <form onSubmit={this.onSubmit}>
          <input type="text"
            name="blogName"
            onChange={this.onChange}
            value={this.state.blogName} />
          <button type="submit">
            Submit
          </button>
        </form>
        <h2>{ this.state.blogName }</h2>
        <h3>{ this.state.blog.title }</h3>
        <div>
          Fetched {this.state.totalFetchedPosts } of { this.state.blog.total_posts || 0}
        </div>
        { posts }
      </div>
    );
  }
}

export default App;
