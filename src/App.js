import React, { Component } from 'react';
import { Button,
         Container,
         Divider,
         Form,
         Grid,
         Header,
         Image,
         Input,
         Message,
         Progress,
         Segment,
         Tab,
         Visibility} from 'semantic-ui-react';
import fetch from 'fetch-retry';
import ReactGA from 'react-ga';

import {
  gridColWidth,
  postIsOriginal,
} from './utils';

import AnalysisPage from './AnalysisPage';
import Post from './Post';
import './App.css';

/* These should be set in `.env` file(s) */
const API_KEY = process.env.REACT_APP_API_KEY;
const GA_TRACKING_ID = process.env.REACT_APP_GA_TRACKING_ID;

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
      stopFetchingPosts: false,
    };
    this.onChange = this.onChange.bind(this);
    this.onSubmit = this.onSubmit.bind(this);
    this.handleInfScrollingUpdate = this.handleInfScrollingUpdate.bind(this);
    this.updateWindowDimensions = this.updateWindowDimensions.bind(this);
  }

  componentDidMount() {
    const pathname = window.location.pathname;
    if (pathname.indexOf('/blog/') !== -1) {
      const blogName = pathname.substring(pathname.indexOf("/blog/") + 6);
      this.setState({blogName}, () => this.onSubmit());
    }
    this.updateWindowDimensions();
    window.addEventListener('resize', this.updateWindowDimensions);

    if (GA_TRACKING_ID) {
      ReactGA.initialize(GA_TRACKING_ID);
    }
  }

  componentWillUnmount() {
    window.removeEventListener('resize', this.updateWindowDimensions);
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

  fetchPosts(url) {
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
  }

  /* The Tumblr API seems to throttle when using max number of simultaneous
  requests, even w/ a token that has the rate limit removed. This approach is
  slower but less prone to 429s */
  fetchPostsSerially(urls) {
    if (urls.length > 0 && !this.state.stopFetchingPosts) {
      const firstUrl = urls[0];
      this.fetchPosts(firstUrl)
          .then(() => this.fetchPostsSerially(urls.slice(1)));
    } else {
      this.setState({loadingPosts: false})
    }
  }

  loadBlogPosts() {
    const stepSize = 20;

    this.setState({loadingPosts: true});

    const postFetchUrls = range(this.state.blog.total_posts, stepSize)
      .map((offset) => {
        const url = new URL(`https://api.tumblr.com/v2/blog/${this.state.blogName}/posts`);
        const params = {api_key: API_KEY,
                        limit: stepSize,
                        reblog_info: true,
                        offset};
        url.search = new URLSearchParams(params);
        return url;
      });

    this.fetchPostsSerially(postFetchUrls);
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

  onChange(evt) {
    this.setState({[evt.target.name]: evt.target.value})
  }

  onSubmit(evt) {
    this.setState({blog: {},
                   posts: [],
                   loadingPosts: false,
                   totalFetchedPosts: 0,
                   numVisiblePosts: 15,
                   error: '',
                   stopFetchingPosts: false,
    });

    if (this.state.blogName.indexOf('.') === -1) {
      this.setState({blogName: this.state.blogName + '.tumblr.com'});
    }

    const blogName = this.state.blogName.replace(/\//g, '')
                                        .replace(/^http[s]?/g, '')
                                        .replace(/:/g, '')
                                        .toLowerCase();

    this.setState({blogName: blogName}, () => {
      const path = window.location.pathname.split('/');
      const containsBlog = path.indexOf('blog') !== -1;
      const pathModifier = containsBlog ? 2 : 1;
      const newPathName = path.splice(0, path.length - pathModifier).join('/') + '/blog/' +
                          this.state.blogName.replace(/\.tumblr\.com/, '');
      window.history.pushState(null, '', newPathName);

      this.getBlogInfo()
          .then(() => this.loadBlogPosts());
    });

    if (GA_TRACKING_ID) {
      ReactGA.pageview(window.location.pathname + window.location.search);
    }

    if (evt) {
      evt.preventDefault();
    }
  }

  renderPostsTab(originalPosts) {
    const posts = originalPosts.sort((a, b) => b.note_count - a.note_count)
                               .slice(0, this.state.numVisiblePosts)
                               .map(p => <Post
                                           key={p.id}
                                           post={p}
                                           windowWidth={this.state.windowWidth}
                                           windowHeight={this.state.windowHeight}/>);
    return (
      <div>
        <Grid centered>
          { posts }
        </Grid>
        {
          originalPosts.length > 0 ? (
            <Visibility className="inf-scroller" onUpdate={this.handleInfScrollingUpdate}>
              { this.state.loadingPosts ? 'Loading...' : 'No more posts' }
            </Visibility>
          ) : null
        }
      </div>
    );
  }

  render() {
    const progressPercent = (this.state.totalFetchedPosts / this.state.blog.total_posts) * 100.0;

    const originalPosts = this.state.posts.filter(postIsOriginal.bind(null, this.state.blogName));

    const panes = [
      { menuItem: 'Top posts', render: () => this.renderPostsTab(originalPosts) },
      { menuItem: 'Analysis', render: () => {
          return (
            <AnalysisPage
              blog={this.state.blog}
              posts={this.state.posts}
              originalPosts={originalPosts}/>
          );
        }
      }
    ]

    return (
      <div>
        <Container className="tt-section">
          <Header as="h1">
            <a href={`${process.env.PUBLIC_URL}/`}>Tumblr Top</a>
            <Header.Subheader>
              View a Tumblr Blog's most popular original posts
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
                onSubmit={this.onSubmit}>
                <Form.Field>
                  <label>Blog Name</label>
                  <Input
                    type="text"
                    name="blogName"
                    loading={this.state.loadingPosts}
                    onChange={this.onChange}
                    value={this.state.blogName}
                    placeholder="Enter a blog name to view its top content"/>
                </Form.Field>
                {
                  this.state.loadingPosts ? (
                    <Button
                      type="button"
                      onClick={() => this.setState({stopFetchingPosts: true})}>
                      Stop Loading
                    </Button>
                  ) : (
                    <Button type="submit" disabled={this.state.blogName === ''}>
                      Get Posts
                    </Button>
                  )
                }
              </Form>
            </Grid.Column>
          </Grid>
          {
            this.state.blog.name ? (
              <Container className="tt-section">
                <Header as="h2">
                  <Image
                    circular
                    avatar
                    src={`https://api.tumblr.com/v2/blog/${this.state.blog.name}/avatar/512`} />
                  <Header.Content>
                    <a href={this.state.blog.url} target="_blank">
                      { this.state.blog.name }
                    </a>
                    {
                      this.state.blog.is_nsfw ? (
                        <span className="tt-nsfw"> NSFW</span>
                      ) : null
                    }
                    <Header.Subheader>
                      { this.state.blog.title }
                    </Header.Subheader>
                  </Header.Content>
                </Header>
              </Container>
            ) : null
          }
          <Container className="tt-section">
            {
              window.location.href.indexOf(this.state.blog.name) !== -1 ? (
                <div>Link to these results: {" "}
                  <a href={window.location.href}>
                    {window.location.href}
                  </a>
                </div>
              ) : null
            }
            {
              this.state.blog.total_posts ? (
                <div className="tt-details">
                  Read {this.state.totalFetchedPosts } of { this.state.blog.total_posts || 0} posts
                </div>
              ): null
            }
            {
              progressPercent < 100 ? (
                <div className="tt-section">
                  <Progress percent={progressPercent} />
                </div>
              ) : null
            }
          </Container>
          {
            this.state.blog.name ? (
              <Tab menu={{ secondary: true, pointing: true }} panes={panes} />
            ) : null
          }
        </Container>
      </div>
    );
  }
}

export default App;
