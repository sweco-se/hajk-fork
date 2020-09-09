import React from "react";
import { withStyles } from "@material-ui/core/styles";
import Grid from "@material-ui/core/Grid";

import {
  Typography,
  List,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Chip,
  Tooltip,
} from "@material-ui/core";

import PlaceIcon from "@material-ui/icons/Place";
import ExpandMoreIcon from "@material-ui/icons/ExpandMore";

import SearchResultsDatasetFeature from "./SearchResultsDatasetFeature";

const styles = (theme) => ({});

class SearchResultsDataset extends React.PureComponent {
  state = {
    numberOfResultsToDisplay:
      this.props.featureCollection.value.numberMatched >
      this.props.featureCollection.value.numberReturned
        ? `${this.props.featureCollection.value.numberReturned}+`
        : this.props.featureCollection.value.numberReturned,
    expanded: this.props.sumOfResults === 1,
  };

  renderResultsDataset = () => {
    const { numberOfResultsToDisplay } = this.state;
    const {
      handleOnResultClick,
      setSelectedFeatureAndSource,
      featureCollection,
    } = this.props;
    console.log("featureCollectioN", featureCollection);

    return (
      <>
        <Accordion
          expanded={this.state.expanded}
          onChange={() => this.setState({ expanded: !this.state.expanded })}
        >
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            <Grid container>
              <Grid item xs={6}>
                <Typography>
                  <PlaceIcon /> {featureCollection.source.caption}
                </Typography>
              </Grid>
              <Grid item xs={6}>
                <Tooltip
                  title={`Visar ${featureCollection.value.numberReturned} av ${featureCollection.value.numberMatched} resultat`}
                >
                  <Chip label={numberOfResultsToDisplay} />
                </Tooltip>
              </Grid>
            </Grid>
          </AccordionSummary>
          <AccordionDetails>
            <List style={{ width: "100%" }}>
              {featureCollection.value.features.map((f) => (
                <SearchResultsDatasetFeature
                  key={f.id}
                  feature={f}
                  source={featureCollection.source}
                  handleOnResultClick={handleOnResultClick}
                  setSelectedFeatureAndSource={setSelectedFeatureAndSource}
                />
              ))}
            </List>
          </AccordionDetails>
        </Accordion>
      </>
    );
  };

  render() {
    const { featureCollection } = this.props;
    return featureCollection.value.numberReturned > 0
      ? this.renderResultsDataset()
      : null;
  }
}

export default withStyles(styles)(SearchResultsDataset);
