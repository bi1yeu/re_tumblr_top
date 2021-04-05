import React from 'react';
import { Card,
         Divider,
         Grid,
         Header,
         Image,
} from 'semantic-ui-react';

import * as moment from 'moment';

import {
  DATE_INPUT_FORMAT,
  DATE_OUTPUT_FORMAT,
  gridColWidth,
} from './utils';

import './App.css';

/* For NSFW posts, the raw post url will redirect to a "This Tumblr may contain
   sensitive media" page, even when the user is logged in. This function
   modifies the URL to one that is accessible for logged-in users. */
const convertNsfwPostUrl = (post, nsfw) => {
  if (!nsfw) {
    return post.post_url;
  }
  const [_, subdomain, post_id] = post.post_url.match(/https:\/\/(.*)\.tumblr\.com\/post\/(.*)/);
  return `https://www.tumblr.com/blog/view/${subdomain}/${post_id}`;
}

const Post = ({ post, windowWidth, nsfw }) => {
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
        href={convertNsfwPostUrl(post, nsfw)}
        target="_blank"
      >
        <div className="tt-card-contents">
          {
            post.type === 'photo' ? (
              <div className="tt-card-image">
                <Image alt={post.photos[0].caption || ""}
                  src={post.photos[0].alt_sizes[1].url} />
              </div>
            ) : null
          }
          {
            embedContent !== null ? (
              <div className="tt-card-image">
                <div dangerouslySetInnerHTML={{ __html: embedContent }} />
              </div>
            ) : null
          }
          <Card.Content className="tt-card-written-contents">
            {
              post.title ? (
                <Header size="medium">
                  {
                    post.url ? (
                      <a href={post.url}>{post.title}</a>
                    ) : post.title
                  }
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
              post.type === 'answer' ? (
                <Card.Description>
                  <div><strong>{post.asking_name}:</strong> <i>{post.question}</i></div>
                  <Divider />
                  <div dangerouslySetInnerHTML={{ __html: post.answer }} />
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
          {
            post.tags && post.tags.length > 0 ? (
              <div className="tt-tag-list">
                {post.tags.map((t, i) => <span key={i}>#{t} </span>)}
              </div>
            ) : null
          }
          <div>
            <span>
              {post.note_count.toLocaleString()} notes
            </span>
            <span className="tt-pull-right">
              {moment(post.date, DATE_INPUT_FORMAT).format(DATE_OUTPUT_FORMAT)}
            </span>
          </div>
        </Card.Content>
      </Card>
    </Grid.Column>
  );
};

export default Post;
