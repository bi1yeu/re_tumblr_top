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

  // get the element in the content.media array with the height closest to 300
  const mediaUrl = (content) => {
    const media = content.media;
    const closest = media.reduce((prev, curr) => {
      return (Math.abs(curr.height - 300) < Math.abs(prev.height - 300) ? curr : prev);
    });
    return closest.url;
  }

  return(
    <Grid.Column width={gridColWidth(windowWidth)}>
      <Card
        fluid
        href={convertNsfwPostUrl(post, nsfw)}
        target="_blank"
      >
        <div className="tt-card-contents">
          { post.content.map((content, i) => {
            if (content.type === "image") {
              return (<div className='tt-card-image' key={`${post.id}.${i}`}>
                <Image alt={content.alt_text || ""} src={mediaUrl(content)} />
              </div>)
            } else if (content.type === "text") {
              return (
                <Card.Description key={`${post.id}.${i}`}>
                  {content.text}
                </Card.Description>)
            } else if (content.type === "video") {
              return (
                <video width="320" height="240" controls>
                  <source src={content.media?.url || content.url} type={content.media?.type || "video/mp4"} />
                  Your browser does not support the video tag.
                </video>
              )
            } else if (content.type === "link") {
              return (
                <Card.Description key={`${post.id}.${i}`}>
                  <a target="_blank" href={content.url}>{content.title || content.url}</a>
                </Card.Description>)

            } else if (content.type === "audio") {
              return (
                <>
                  { content.poster ? (<Image src={content.poster[0].url} />) : null}
                  <audio controls>
                    <source src={content.media?.url || content.url} type={content.media?.type || "audio/mp3"} />
                  Your browser does not support the audio element.
                  </audio>
                </>
              )
            }
          }
          )}
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
