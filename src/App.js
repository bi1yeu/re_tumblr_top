import React, { Component } from 'react';
import { Button,
         Card,
         Container,
         Divider,
         Form,
         Grid,
         Header,
         Image,
         Input,
         Message,
         Progress,
         Visibility} from 'semantic-ui-react';
import * as moment from 'moment';
import fetch from 'fetch-retry';
import './App.css';

const DATE_INPUT_FORMAT = 'YYYY-MM-DD HH:mm:ss z'
const DATE_OUTPUT_FORMAT = 'MMM D, YYYY';
const UPDATE_EVERY_N_POSTS = 100;

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
    } else if (response.status === 401) {
      errorMessage = "Can't get blog info from Tumblr.  Please come back later."
    }
    throw Error(errorMessage);
  } else {
    return response.json();
  }
};

/* Used to dynamically resize the columns depending on window width */
const gridColWidth = (windowWidth) => {
  if (windowWidth > 1100) {
    return 5;
  }
  if (windowWidth > 600) {
    return 8;
  }
  return 15;
};

const Post = ({ post, windowWidth }) => {
  /* For audio/video posts, the player/player.embed_code property is HTML for an
   * iframe with fixed sizes. This is janky, but it looks better than the canned
   * width. */
  let embedContent = null;
  if (post.player) {
    if (post.player instanceof Array &&
        (typeof post.player[1].embed_code === 'string' ||
         post.player[1].embed_code instanceof String)) {
      embedContent = post.player[1].embed_code.replace(/width="\d+"/, "width=\"100%\"");
    } else if (typeof post.player === 'string' || post.play instanceof String) {
      embedContent = post.player.replace(/width="\d+"/, "width=\"100%\"").replace(/height="\d+"/, "height=\"30%\"");
    }
  }

  return(
    <Grid.Column width={gridColWidth(windowWidth)}>
      <Card
        fluid
        href={post.post_url}
        target="_blank"
      >
        <div className="card-contents">
          {
            post.type === 'photo' ? (
              <div className="cardImage">
                <Image alt={post.photos[0].caption || ""}
                  src={post.photos[0].alt_sizes[1].url} />
              </div>
            ) : null
          }
          {
            embedContent !== null ? (
              <div className="cardImage">
                <div dangerouslySetInnerHTML={{ __html: embedContent }} />
              </div>
            ) : null
          }
          <Card.Content className="card-written-contents">
            {
              post.title ? (
                <Header size="medium">
                  {post.title}
                </Header>
              ) : null
            }
            {
              post.caption ? (
                <Card.Description>
                  <div dangerouslySetInnerHTML={{ __html: post.caption }} />
                </Card.Description>
              ) : null
            }
            {
              post.body ? (
                <Card.Description>
                  <div dangerouslySetInnerHTML={{ __html: post.body }} />
                </Card.Description>
              ) : null
            }
            {
              post.type === 'quote' ? (
                <Card.Description>
                  <div dangerouslySetInnerHTML={{ __html: post.text }} />
                  Source: <div dangerouslySetInnerHTML={{ __html: post.source }} />
                </Card.Description>
              ) : null
            }
          </Card.Content>
        </div>
        <Card.Content extra>
          <span>
            {post.note_count.toLocaleString()} notes
          </span>
          <span className="pull-right">
            {moment(post.date, DATE_INPUT_FORMAT).format(DATE_OUTPUT_FORMAT)}
          </span>
        </Card.Content>
      </Card>
    </Grid.Column>
  );
};

class App extends Component {
  constructor(props) {
    super(props);
    this.state = {
      blogName: '',
      blog: {},
      posts: [],
      totalFetchedPosts: 0,
      numVisiblePosts: 15,
      error: '',
      loadingPosts: false,
      windowWidth: window.innerWidth,
      windowHeight: window.innerHeight,
    };
    this.onChange = this.onChange.bind(this);
    this.onSubmit = this.onSubmit.bind(this);
    this.postIsOriginal = this.postIsOriginal.bind(this);
    this.handleInfScrollingUpdate = this.handleInfScrollingUpdate.bind(this);
    this.updateWindowDimensions = this.updateWindowDimensions.bind(this);
  }

  componentDidMount() {
    const path = window.location.pathname.split('/');
    if (path.filter(p => p !== '').length > 0) {
      const blogName = path[path.length - 1];
      this.setState({blogName}, () => this.onSubmit());
    }
    this.updateWindowDimensions();
    window.addEventListener('resize', this.updateWindowDimensions);
  }

  componentWillUnmount() {
    window.removeEventListener('resize', this.updateWindowDimensions);
  }

  shouldComponentUpdate(nextProps, nextState) {
    /* Can only fetch 20 posts at a time, don't want to sort, filter, and
       rerender after every fetch */

    return this.state.totalFetchedPosts <= 40 ||
           this.state.totalFetchedPosts === nextState.totalFetchedPosts ||
           nextState.totalFetchedPosts % UPDATE_EVERY_N_POSTS === 0 ||
           nextState.totalFetchedPosts >= this.state.blog.total_posts;
  }

  // via https://stackoverflow.com/a/42141641
  updateWindowDimensions() {
    this.setState({ windowWidth: window.innerWidth, windowHeight: window.innerHeight });
  }

  handleInfScrollingUpdate(evt, {calculations}) {
    if (calculations.onScreen && this.state.posts.length > 0) {
      this.setState({numVisiblePosts: this.state.numVisiblePosts + 6});
    }
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

    /* Some really old posts have the reblog path under a `comment` key */
    if (post.reblog &&
        post.reblog.comment &&
        post.reblog.comment.indexOf('.tumblr.com/') !== -1) {
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
                   numVisiblePosts: 15,
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
                      .slice(0, this.state.numVisiblePosts)
                      .map(p => <Post
                                  key={p.id}
                                  post={p}
                                  windowWidth={this.state.windowWidth}
                                  windowHeight={this.state.windowHeight}/>);
    const progressPercent = (this.state.totalFetchedPosts / this.state.blog.total_posts) * 100.0;
    return (
      <div>
        <Container text>
          <Header as="h1">
            <a href="/">Tumblr Top</a>
            <Header.Subheader>
              View a Tumblr Blog's best original posts
            </Header.Subheader>
          </Header>
        </Container>
        <Divider />
        <Container>
          {
            this.state.error ? (
              <Message visible negative>
                <Message.Header>
                  Error
                </Message.Header>
                <p>
                  {this.state.error}
                </p>
              </Message>
            ) : null
          }
          <Grid>
            <Grid.Column width={gridColWidth(this.state.windowWidth)}>
              <Form
                onSubmit={this.onSubmit}
                loading={this.state.loadingPosts}>
                <Form.Field>
                  <label>Blog Name</label>
                  <Input
                    type="text"
                    name="blogName"
                    onChange={this.onChange}
                    value={this.state.blogName}
                    placeholder="Blog name (e.g. 1041uuu)"/>
                </Form.Field>
                <Button type="submit" disabled={this.state.blogName === ''}>
                  Get Posts
                </Button>
              </Form>
            </Grid.Column>
          </Grid>
          <Header as="h2">
            { this.state.blog.name }
            <Header.Subheader>
              { this.state.blog.title }
            </Header.Subheader>
          </Header>
          <div>
            Read {this.state.totalFetchedPosts } of { this.state.blog.total_posts || 0} posts.
          </div>
          {
            progressPercent < 100 ? (
              <Progress percent={progressPercent} />
            ) : null
          }
          <Divider />
          <Grid centered>
            { posts }
          </Grid>
        </Container>
        {
          this.state.posts.filter(this.postIsOriginal).length > 0 ? (
            <Visibility className="inf-scroller" onUpdate={this.handleInfScrollingUpdate}>
              No more posts
            </Visibility>
          ) : null
        }
      </div>
    );
  }
}

export default App;
