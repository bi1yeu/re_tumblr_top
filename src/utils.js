import * as moment from 'moment';

export const DATE_INPUT_FORMAT = 'YYYY-MM-DD HH:mm:ss z';
export const DATE_OUTPUT_FORMAT = 'MMM D, YYYY';

/* Some old posts lack reblog information so this is used as part of the
   heuristic to determine whether or not a post is original. */
const OLD_POST_CUTOFF = moment('2011-01-01T00:00:00Z');

/* Used to dynamically resize the columns depending on window width */
export const gridColWidth = (windowWidth) => {
  if (windowWidth > 1100) {
    return 5;
  }
  if (windowWidth > 600) {
    return 8;
  }
  return 15;
};

export const postIsOriginal = (blogName, post) => {
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
      post.trail[0].blog.name !== blogName.replace(/\.tumblr\.com/, '')) {
    return false;
  }

  /* Others have a reblog tree with links */
  if (post.reblog && post.reblog.tree_html.indexOf('.tumblr.com/') !== -1) {
    return false;
  }

  /* Some really old posts have the reblog path under a `comment` key */
  if (moment(post.date, DATE_INPUT_FORMAT).isBefore(OLD_POST_CUTOFF) &&
      post.reblog &&
      post.reblog.comment &&
      post.reblog.comment.indexOf('.tumblr.com/') !== -1) {
    return false;
  }

  return true;
}
