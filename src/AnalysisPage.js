import React from 'react';
import {
  Container,
  Divider,
  Header,
  Statistic,
} from 'semantic-ui-react';
import {
  VictoryAxis,
  VictoryBar,
  VictoryChart,
  VictoryLabel,
  VictoryLegend,
  VictoryPie,
  VictoryScatter,
  VictoryTooltip,
  VictoryVoronoiContainer,
  createContainer,
} from 'victory';
import * as moment from 'moment';

import {
  DATE_INPUT_FORMAT,
  DATE_OUTPUT_FORMAT
} from './utils';
import './App.css';

const NUM_TAGS_DISPLAYED = 10;

const VictoryZoomVoronoiContainer = createContainer("zoom", "voronoi");

const ChartWrapper = ({children, title, paddingBottom, zoom}) => {

  const containerComponent = zoom ? (
    <VictoryZoomVoronoiContainer
      responsive={true}
      className="tt-chart"
      zoomDimension="x" />
  ) : (
    <VictoryVoronoiContainer
      responsive={true}
      className="tt-chart" />
  );

  return(
    <Container className="tt-chart-container">
      <Header
        as="h3"
        textAlign="center">
        {title}
      </Header>
      <VictoryChart
        domainPadding={3}
        style={{ parent: { maxWidth: "65%" } }}
        padding={{ left: 80,
                   top: 0,
                   right: 40,
                   bottom: paddingBottom ? paddingBottom : 40 }}
        scale={{x: "time"}}
        containerComponent={containerComponent}
      >
        {children}
      </VictoryChart>
    </Container>
  );
};

const postToDatum = (post) => {
  const moment_date = moment(post.date, DATE_INPUT_FORMAT);
  const date = moment_date.toDate();
  const label = `${moment_date.format(DATE_OUTPUT_FORMAT)}: ${post.note_count.toLocaleString()} notes`;
  return {
    label,
    date,
    noteCount: post.note_count,
  };
};

const PostNotesOverTimeChart = ({posts}) => {
  // TODO consider doing this to improve perf for large datasets
  // https://formidable.com/open-source/victory/guides/zoom-large-data/

  const postNotesOverTime = posts.map(postToDatum);

  return(
    <ChartWrapper title="Original Post Notes Over Time" zoom>
      <VictoryScatter
        labelComponent={<VictoryTooltip
                          flyoutStyle={{fill: "white"}}
                          cornerRadius={0}/>}
        data={postNotesOverTime}
        x="date"
        y="noteCount" />
    </ChartWrapper>
  );
};

const reduceTagNotes = (posts) =>  {
  return posts.reduce((acc, post) => {
    const noteCount = post.note_count;
    post.tags.forEach(t => {
      const newVal = acc[t] ? acc[t] + noteCount : noteCount;
      acc[t] = newVal;
    });
    return acc;
  }, {});
}

const TagNotesChart = ({posts}) => {
  const notesByTag = reduceTagNotes(posts);
  const tagNotes = Object.keys(notesByTag)
                         .map(k => {return {tag: k, noteCount: notesByTag[k]}})
                         .sort((a, b) => b.noteCount - a.noteCount)
                         .slice(0, NUM_TAGS_DISPLAYED);

  if (tagNotes.length === 0) {
    return <div />;
  }

  return(
    <ChartWrapper
      title="Notes on Most Popular Tags"
      paddingBottom={60}>
      <VictoryBar
        labels={(d) => `${d.y.toLocaleString()} notes`}
        labelComponent={<VictoryTooltip
                          flyoutStyle={{fill: "white"}}
                                      cornerRadius={0}/>}
        data={tagNotes}
        x="tag"
        y="noteCount"
      />
      <VictoryAxis dependentAxis />
      <VictoryAxis independentAxis
        tickLabelComponent={<VictoryLabel
                              angle={-35}
                                    y={252}
                                    textAnchor="end"
                                    verticalAnchor="middle" />} />
    </ChartWrapper>
  );
};

const reduceTypeNotes = (posts) =>  {
  return posts.reduce((acc, post) => {
    const noteCount = post.note_count;
    const postType = post.type;
    const newVal = acc[postType] ? acc[postType] + noteCount : noteCount;
    acc[postType] = newVal;
    return acc;
  }, {});
}

const TypeNotesChart = ({posts}) => {
  const notesByType = reduceTypeNotes(posts);
  const typeNotes = Object.keys(notesByType)
                          .map(k => {return {type: k, noteCount: notesByType[k]}})
                          .sort((a, b) => b.noteCount - a.noteCount);

  if (typeNotes.length < 2) {
    return <div />;
  }

  return(
    <ChartWrapper
      title="Notes by Post Type"
      paddingBottom={60}>
      <VictoryBar
        labels={(d) => `${d.y.toLocaleString()} notes`}
        labelComponent={<VictoryTooltip
                          flyoutStyle={{fill: "white"}}
                          cornerRadius={0}/>}
        data={typeNotes}
        x="type"
        y="noteCount"
      />
      <VictoryAxis dependentAxis />
      <VictoryAxis independentAxis
        tickLabelComponent={<VictoryLabel
                              angle={-35}
                              y={252}
                              textAnchor="end"
                              verticalAnchor="middle" />} />
    </ChartWrapper>
  );
};

const reduceTypeCount = (posts) =>  {
  return posts.reduce((acc, post) => {
    const postType = post.type;
    const newVal = acc[postType] ? acc[postType] + 1 : 1;
    acc[postType] = newVal;
    return acc;
  }, {});
}

const PieChart = ({data, title}) => {
  return(
    <Container className="tt-chart-container">
      <Header
        as="h3"
        textAlign="center">
        {title}
      </Header>
      <div className="tt-chart tt-pie">
        <svg viewBox="0 0 400 400">
          <VictoryPie standalone={false}
            padding={{
          	  left: 0, bottom: 40, top: 10
            }}
            data={data}
            labels={() => null}
          />
          <VictoryLegend standalone={false}
            centerTitle
            style={{ border: { stroke: "black", fill: "white"} }}
            data={data.map(d => ({name: d.x}))}
            gutter={20}
          />
        </svg>
      </div>
    </Container>
  );
};

const PostTypeBreakdownChart = ({posts}) => {
  const postCountByType = reduceTypeCount(posts);
  const typePosts = Object.keys(postCountByType)
                          .map(k => {return {x: k, y: postCountByType[k]}})
                          .sort((a, b) => b.y - a.y);

  return(
    <PieChart title="Post Types" data={typePosts} />
  );
};

const CreatorVsCuratorChart = ({originalPostCount, totalPostCount}) => {
  const data = [{x: 'original', y: originalPostCount},
                {x: 'reblogged', y: totalPostCount - originalPostCount}];

  return(<PieChart title="Creator vs. Curator" data={data} />)
};

const AnalysisPage = ({blog, posts, originalPosts}) => {

  const originalPostCount = originalPosts.length;
  const totalPostCount = blog.total_posts;
  const totalOriginalNoteCount = originalPosts.reduce((acc, p) => {return acc + p.note_count}, 0);
  const firstPostDate = moment.min(posts.map(p => moment(p.date, DATE_INPUT_FORMAT)));
  const daysSinceFirstPost = moment().diff(firstPostDate, 'days') + 1;

  return (
    <div>
      <Container className="tt-section">
        <Statistic.Group className="tt-statistics">
          <Statistic>
            <Statistic.Value>
              {totalPostCount.toLocaleString()}
            </Statistic.Value>
            <Statistic.Label>
              Total posts
            </Statistic.Label>
          </Statistic>
          <Statistic>
            <Statistic.Value>
              {originalPostCount.toLocaleString()}
            </Statistic.Value>
            <Statistic.Label>
              Original posts
            </Statistic.Label>
          </Statistic>
        </Statistic.Group>
        <Statistic.Group className="tt-statistics" size="small">
          <Statistic>
            <Statistic.Value>
              {totalOriginalNoteCount.toLocaleString()}
            </Statistic.Value>
            <Statistic.Label>
              Orig. post notes
            </Statistic.Label>
          </Statistic>
          <Statistic>
            <Statistic.Value>
              {(totalOriginalNoteCount / originalPostCount).toLocaleString(undefined, {maximumFractionDigits: 2})}
            </Statistic.Value>
            <Statistic.Label>
              Avg. notes / orig. post
            </Statistic.Label>
          </Statistic>
          <Statistic>
            <Statistic.Value>
              {(posts.length / daysSinceFirstPost).toLocaleString(undefined, {maximumFractionDigits: 2})}
            </Statistic.Value>
            <Statistic.Label>
              Avg. posts / day
            </Statistic.Label>
          </Statistic>
        </Statistic.Group>
      </Container>
      <Divider />
      <Container className="tt-section">
        <CreatorVsCuratorChart
          originalPostCount={originalPostCount}
          totalPostCount={posts.length} />
        <PostNotesOverTimeChart posts={originalPosts} />
        <TagNotesChart posts={originalPosts} />
        <TypeNotesChart posts={originalPosts} />
        <PostTypeBreakdownChart posts={originalPosts} />
      </Container>
    </div>
  );

};

export default AnalysisPage;
