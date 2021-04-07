import React from "react";

import { withStyles } from "@material-ui/core/styles";
import {
  Tooltip,
  Grid,
  Switch,
  FormGroup,
  FormLabel,
  FormControl,
  FormControlLabel,
  Select,
  Chip,
  MenuItem,
  Input,
} from "@material-ui/core";

const styles = (theme) => ({
  chips: {
    display: "flex",
    flexWrap: "wrap",
  },
  chip: {
    margin: 2,
  },
});

class SearchSettings extends React.PureComponent {
  state = {
    searchOptions: this.props.searchOptions,
    showSearchSourcesFilter: this.props.searchSources.length > 0 ? true : false,
  };

  updateSearchOptions = (name, value) => {
    const { searchOptions } = this.props;
    searchOptions[name] = value;
    this.setState(searchOptions);
    this.props.updateSearchOptions(searchOptions);
  };

  render() {
    const { classes, searchOptions, searchSources, searchModel } = this.props;
    return (
      <Grid container spacing={2} direction="column">
        <Grid item xs>
          <FormControl component="fieldset">
            <FormLabel component="legend">Generella sökinställningar</FormLabel>
            <FormGroup>
              <Tooltip title="Slå på för att välja vilka datakällor som sökningen kommer göras i. Om reglaget är i off-läget kommer sökningen att ske i alla tillgänliga sökkällor.">
                <FormControlLabel
                  label="Begränsa sökkällor"
                  control={
                    <Switch
                      checked={this.state.showSearchSourcesFilter}
                      onChange={(e) => {
                        // Pull out the new value
                        const showSearchSourcesFilter = e.target.checked;

                        // Set state to reflect in Switch's UI
                        this.setState({
                          showSearchSourcesFilter,
                        });

                        // Now, if user has turned off this setting, ensure
                        // that we also clean all search sources
                        if (showSearchSourcesFilter === false)
                          this.props.setSearchSources([]);
                      }}
                      color="primary"
                    />
                  }
                />
              </Tooltip>
              {this.state.showSearchSourcesFilter && (
                <Grid container spacing={2}>
                  <Grid item xs>
                    <Select
                      fullWidth
                      labelId="demo-mutiple-chip-label"
                      multiple
                      value={searchSources}
                      onChange={(event) =>
                        this.props.setSearchSources(event.target.value)
                      }
                      input={<Input id="select-multiple-chip" />}
                      renderValue={(selected) => (
                        <div className={classes.chips}>
                          {selected.map((option) => (
                            <Chip
                              key={option.id}
                              label={option.caption}
                              className={classes.chip}
                            />
                          ))}
                        </div>
                      )}
                    >
                      {searchModel.getSources().map((source) => (
                        <MenuItem
                          key={source.id}
                          value={source}
                          // style={getStyles(name, personName, theme)}
                        >
                          {source.caption}
                        </MenuItem>
                      ))}
                    </Select>
                  </Grid>
                </Grid>
              )}
            </FormGroup>
          </FormControl>
        </Grid>

        <Grid item xs>
          <FormControl component="fieldset">
            <FormLabel component="legend">
              Inställningar för textsökning
            </FormLabel>
            <FormGroup>
              <Tooltip title="Om aktivt kommer en sökning på 'väg' även ge träffar på exempelvis 'storväg'.">
                <FormControlLabel
                  label="Wildcard före"
                  control={
                    <Switch
                      checked={searchOptions.wildcardAtStart}
                      onChange={() =>
                        this.updateSearchOptions(
                          "wildcardAtStart",
                          !searchOptions.wildcardAtStart
                        )
                      }
                      color="primary"
                    />
                  }
                />
              </Tooltip>
              <Tooltip title="Om aktivt kommer en sökning på 'väg' även ge träffar på exempelvis 'vägen'.">
                <FormControlLabel
                  label="Wildcard efter"
                  control={
                    <Switch
                      checked={searchOptions.wildcardAtEnd}
                      onChange={() =>
                        this.updateSearchOptions(
                          "wildcardAtEnd",
                          !searchOptions.wildcardAtEnd
                        )
                      }
                      color="primary"
                    />
                  }
                />
              </Tooltip>
              <Tooltip title="Om aktivt kommer en sökning på 'a' inte ge träffar på 'A'. Inaktivera för att söka oberoende av gemener/versaler.">
                <FormControlLabel
                  label="Skiftlägeskänslighet"
                  control={
                    <Switch
                      checked={searchOptions.matchCase}
                      onChange={() =>
                        this.updateSearchOptions(
                          "matchCase",
                          !searchOptions.matchCase
                        )
                      }
                      color="primary"
                    />
                  }
                />
              </Tooltip>
            </FormGroup>
          </FormControl>
        </Grid>

        <Grid item xs>
          <FormControl component="fieldset">
            <FormLabel component="legend">Spatiala sökinställningar</FormLabel>
            <FormGroup>
              <Tooltip title="Om aktivt kommer hela objektet (exempelvis en fastigheten) behöva rymmas inom sökområdet för att komma med i resultatet. Om inaktivt räcker det att endast en liten del av objektet ryms inom, eller nuddar vid, sökområdet.">
                <FormControlLabel
                  label="Kräv att hela objektet ryms inom sökområde"
                  control={
                    <Switch
                      checked={searchOptions.activeSpatialFilter === "within"}
                      onChange={() =>
                        this.updateSearchOptions(
                          "activeSpatialFilter",
                          searchOptions.activeSpatialFilter === "intersects"
                            ? "within"
                            : "intersects"
                        )
                      }
                      color="primary"
                    />
                  }
                />
              </Tooltip>
            </FormGroup>
          </FormControl>
        </Grid>
      </Grid>
    );
  }
}

export default withStyles(styles)(SearchSettings);
