import React, { Component } from 'react';
import logo from './logo.svg';
import './App.css';

import fetch from 'fetch-retry';
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
      totalFetchedPosts: 0
    };
    this.onChange = this.onChange.bind(this);
    this.onSubmit = this.onSubmit.bind(this);
  }

  getPosts() {
    const url = new URL(`https://api.tumblr.com/v2/blog/${this.state.blogName}/posts`);
    const limit = 20;
    var params = {api_key: API_KEY,
                  limit: limit,
                  reblog_info: true};
    const max_posts = 2000; // this.state.blog.total_posts;
    var fetchedPosts = []

    for (var i = 0; i < max_posts; i += limit) {
      params.offset = i;
      url.search = new URLSearchParams(params)
      fetch(url)
        .then(data => data.json())
        .then(data => {
          fetchedPosts = fetchedPosts.concat(data.response.posts);
          if (i % 100 == 0 || i == max_posts) {
            const totalFetchedPosts = this.state.totalFetchedPosts + fetchedPosts.length;
            const filteredPosts = this.state.posts
                                      .concat(fetchedPosts)
                                      .filter(this.postIsOriginal)
                                      .sort((a, b) => a.note_count < b.note_count);
            this.setState({posts: filteredPosts, totalFetchedPosts});
            fetchedPosts = []
          }
        });
    }
  }

  getBlogInfo() {
    const url = new URL(`https://api.tumblr.com/v2/blog/${this.state.blogName}/info`);
    const params = {api_key: API_KEY}
    url.search = new URLSearchParams(params)

    fetch(url, {
      method: 'GET'
    })
      .then(data => data.json())
      .then(info => this.setState({blog: info.response.blog}))
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
        post.trail[0].content.indexOf('.tumblr.com/' !== -1)) {
      return false;
    }

    /* Others have a reblog tree with links */
    if (post.reblog && post.reblog.tree_html.indexOf('.tumblr.com/') !== -1) {
      return false;
    }

    return true;
  }

  onChange(e) {
    this.setState({[e.target.name]: e.target.value})
  }

  onSubmit(e) {
    this.setState({blog: {}, posts: [], totalFetchedPosts: 0});
    this.getBlogInfo();
    this.getPosts();
    e.preventDefault();
  }

  render() {
    const posts = this.state.posts.map(p => <Post key={p.id} post={p} />);
    return (
      <div className="App">
        <header className="App-header">
          <img src={logo} className="App-logo" alt="logo" />
          <h1 className="App-title">Welcome to React</h1>
        </header>
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
