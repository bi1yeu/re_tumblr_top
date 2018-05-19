import React, { Component } from 'react';
import { Button,
         Container,
         Divider,
         Form,
         Header,
         Input,
         Message,
         Progress} from 'semantic-ui-react';

import fetch from 'fetch-retry';
const range = (to, step) =>
  Array.from(new Array(to), (x,i) => i)
       .filter((i) => i % step === 0);

const handleResponse = (response) => {
  if (!response.ok) {
    var errorMessage = 'Something went wrong.'
    if (response.status === 404) {
      errorMessage = "Couldn't find that blog, sorry.";
    } else if (response.status === 429) {
      errorMessage = 'Too many requests. Please come back later.'
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
      error: '',
      loadingPosts: false
    };
    this.onChange = this.onChange.bind(this);
    this.onSubmit = this.onSubmit.bind(this);
    this.postIsOriginal = this.postIsOriginal.bind(this);
  }

  componentDidMount() {
    const path = window.location.pathname.split('/');
    if (path.filter(p => p !== '').length > 0) {
      const blogName = path[path.length - 1];
      this.setState({blogName}, () => this.onSubmit());
    }
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

    this.setState({loadingPosts: true});

    const postRequests = range(this.state.blog.total_posts, stepSize)
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

    Promise.all(postRequests).then(() => this.setState({loadingPosts: false}));
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

    /* Some really old posts have the reblog path under a `content` key */
    if (post.reblog && post.reblog.content && post.reblog.content.indexOf('.tumblr.com/') !== -1) {
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
                   loadingPosts: false,
                   totalFetchedPosts: 0,
                   error: ''});
    if (this.state.blogName.indexOf('.tumblr.com') === -1) {
      this.setState({blogName: this.state.blogName + '.tumblr.com'});
    }

    // TODO account for if this page is hosted not at root
    const path = window.location.pathname.split('/');
    const newPathName = path.splice(0, path.length - 1).join('/') +
                        this.state.blogName.replace(/\.tumblr\.com/, '');
    window.history.pushState(null, '', newPathName);

    this.getBlogInfo().then(() => this.getPosts());
    if (evt) {
      evt.preventDefault();
    }
  }

  render() {
    const posts = this.state.posts
                      .filter(this.postIsOriginal)
                      .sort((a, b) => a.note_count < b.note_count)
                      .slice(0, this.state.displayNumPosts)
                      .map(p => <Post key={p.id} post={p} />);
    const progressPercent = (this.state.totalFetchedPosts / this.state.blog.total_posts) * 100.0;
    return (
      <div>
        <Container>
          <Header>
            <h1><a href="/">Tumblr Top</a></h1>
            <Header.Subheader>
              View a Tumblr Blog's best original posts
            </Header.Subheader>
          </Header>
        </Container>
        <Divider />
        <Container>
          {
            this.state.error ?
            <Message negative={true}>
              <Message.Header>
                Error
              </Message.Header>
              <p>
                {this.state.error}
              </p>
            </Message> :
            <div />
          }
          <Form onSubmit={this.onSubmit}>
            <Form.Field>
              <label>Blog Name</label>
              <Input
                type="text"
                name="blogName"
                onChange={this.onChange}
                value={this.state.blogName}
                loading={this.state.loadingPosts}
                placeholder="Blog name (e.g. 1041uuu)"/>
            </Form.Field>
            <Button type="submit" disabled={this.state.blogName === ''}>
              Get Posts
            </Button>
          </Form>
          <h2>{ this.state.blog.name }</h2>
          <h3>{ this.state.blog.title }</h3>
          <div>
            Read {this.state.totalFetchedPosts } of { this.state.blog.total_posts || 0} posts.
          </div>
          { progressPercent < 100 ? <Progress percent={progressPercent} /> : <div />}
          <Divider />
          { posts }
        </Container>
      </div>
    );
  }
}

export default App;
