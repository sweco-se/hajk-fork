import React from "react";
import cslx from "clsx";
import Grid from "@material-ui/core/Grid";
import ClearIcon from "@material-ui/icons/Clear";
import withWidth from "@material-ui/core/withWidth";
import Autocomplete from "@material-ui/lab/Autocomplete";
import SearchIcon from "@material-ui/icons/Search";
import RoomIcon from "@material-ui/icons/Room";
import DescriptionIcon from "@material-ui/icons/Description";
import CheckBoxOutlineBlankIcon from "@material-ui/icons/CheckBoxOutlineBlank";
import CheckBoxIcon from "@material-ui/icons/CheckBox";
import SearchResultsContainer from "./SearchResultsContainer";
import SearchTools from "./SearchTools";
import { withTheme, useTheme, withStyles } from "@material-ui/core/styles";
import {
  CircularProgress,
  IconButton,
  Paper,
  TextField,
  Checkbox,
  Typography,
  FormHelperText,
  useMediaQuery,
  Popper,
} from "@material-ui/core";

const styles = (theme) => ({
  searchContainer: {
    width: 400,
    height: theme.spacing(6),
  },
  searchCollapsed: {
    left: -440,
  },

  autocompleteTypography: {
    paddingRight: 8,
    maxWidth: "60%",
  },

  inputRoot: {
    height: theme.spacing(6),
  },
  hidden: {
    display: "none",
  },
});

//Needed to make a CustomPopper with inlinestyling to be able to override width.. *
//Popper.js didnt work as expected
const CustomPopper = (props) => {
  const theme = useTheme();
  const smallScreen = useMediaQuery(theme.breakpoints.down("xs"));
  const style = smallScreen ? { width: "100%" } : { width: 400 };
  return (
    <Popper
      {...props}
      style={style}
      popperOptions={{
        modifiers: {
          computeStyle: { gpuAcceleration: false },
        },
      }}
      placement="bottom-start"
    />
  );
};

class SearchBar extends React.PureComponent {
  state = {
    drawActive: false,
    panelCollapsed: false,
    moreOptionsId: undefined,
    moreOptionsOpen: false,
    selectSourcesOpen: false,
    resultPanelCollapsed: false,
  };

  updateSearchOptions = (name, value) => {
    const { searchOptions } = this.props;
    searchOptions[name] = value;
    this.props.updateSearchOptions(searchOptions);
  };

  getOriginBasedIcon = (origin) => {
    switch (origin) {
      case "WFS":
        return <RoomIcon color="disabled"></RoomIcon>;
      case "DOCUMENT":
        return <DescriptionIcon color="disabled"></DescriptionIcon>;
      default:
        return <RoomIcon color="disabled"></RoomIcon>;
    }
  };

  removeCommasAndSpaces = (string) => {
    return string.replace(/,/g, "").replace(/ /g, "");
  };

  //Cant use string.prototype.matchAll because of Edge (Polyfill not working atm)
  getMatches = (string, regex, index) => {
    var matches = [];
    var match = regex.exec(string);

    while (match != null && match[0] !== "") {
      matches.push(match);
      match = regex.exec(string);
    }
    return matches;
  };

  getAllStartingIndexForOccurencesInString = (toSearchFor, toSearchIn) => {
    let regexp = new RegExp(this.props.escapeRegExp(toSearchIn), "gi");
    let matches = this.getMatches(toSearchFor, regexp);
    let matchedIndexes = matches.map((match) => match.index);
    return matchedIndexes;
  };

  removeDuplicateHighlightMatches = (highlightMatches) => {
    //throw away duplicate matches within highlightInformation - otherwise parts of the matched phrase may show multiple times.
    let cleanedMatches = [];
    let startIndexes = [];
    highlightMatches.forEach((match) => {
      if (!startIndexes.includes(match.startIndex)) {
        startIndexes.push(match.startIndex);
      }
    });
    highlightMatches.sort((a, b) => a.startIndex - b.startIndex);

    //keep only the longest match for each different start index.
    startIndexes.forEach((i) => {
      let tempArray = [];
      highlightMatches.forEach((h) => {
        if (h.startIndex === i) {
          tempArray.push(h);
        }
      });
      if (tempArray.length > 0) {
        tempArray.sort((a, b) => a.matchLength - b.matchLength);
        cleanedMatches.push(tempArray.pop());
      }
    });

    return cleanedMatches.sort((a, b) => a.startIndex - b.startIndex);
  };

  getMultipleHighlightedAutoCompleteEntryElements = (
    highlightInformation,
    autocompleteEntry
  ) => {
    let stringPartObjects = [];

    highlightInformation.forEach((currentHighlight, i, array) => {
      let strongText = autocompleteEntry.slice(
        currentHighlight.startIndex,
        currentHighlight.startIndex + currentHighlight.matchLength
      );
      stringPartObjects.push({ text: strongText, bold: true });

      let nextHighlight = array[i + 1] || null;
      if (nextHighlight) {
        let normalText = autocompleteEntry.slice(
          currentHighlight.startIndex + currentHighlight.matchLength,
          nextHighlight.startIndex
        );
        stringPartObjects.push({ text: normalText, bold: false });
      } else {
        let normalText = autocompleteEntry.slice(
          currentHighlight.startIndex + currentHighlight.matchLength
        );
        stringPartObjects.push({ text: normalText, bold: false });
      }
    });

    return (
      <>
        {stringPartObjects.map((obj, index) => {
          if (obj.bold) {
            return <strong key={index}>{obj.text}</strong>;
          } else {
            return obj.text;
          }
        })}
      </>
    );
  };

  getSingleHighlightedAutoCompleteEntryElement = (
    highlightInformation,
    autocompleteEntry
  ) => {
    let { startIndex, matchLength } = highlightInformation[0];
    //if the match is not at the beginning of the string, return the non matched part first.
    if (startIndex > 0) {
      return (
        <>
          {autocompleteEntry.slice(0, startIndex)}
          <strong>
            {autocompleteEntry.slice(startIndex, startIndex + matchLength)}
          </strong>
        </>
      );
    } else {
      return (
        <>
          <strong>
            {autocompleteEntry.slice(0, startIndex + matchLength)}
          </strong>
          {autocompleteEntry.slice(startIndex + matchLength)}
        </>
      );
    }
  };

  //Highlights everything in autocomplete entry up until the last occurrence of a match in string.
  renderHighlightedAutocompleteEntry = (
    highlightInformation,
    autocompleteEntry
  ) => {
    const countOfHighlightInformation = highlightInformation.length;

    //get autocomplete entry element based on highlight information, if there are multiple matches, get highlight information for all matches.
    if (countOfHighlightInformation === 1) {
      return this.getSingleHighlightedAutoCompleteEntryElement(
        highlightInformation,
        autocompleteEntry
      );
    }

    if (countOfHighlightInformation > 1) {
      highlightInformation = this.removeDuplicateHighlightMatches(
        highlightInformation
      );
      return this.getMultipleHighlightedAutoCompleteEntryElements(
        highlightInformation,
        autocompleteEntry
      );
    }
  };

  getHighlightedACE = (searchString, autocompleteEntry) => {
    const { getArrayWithSearchWords, classes } = this.props;
    const stringArraySS = getArrayWithSearchWords(searchString);
    let highlightInformation = stringArraySS
      .map((searchWord) => {
        return this.getAllStartingIndexForOccurencesInString(
          autocompleteEntry,
          searchWord
        ).map((index) => {
          return {
            startIndex: index,
            matchLength: searchWord.length,
          };
        });
      })
      .flat();

    return (
      <Typography noWrap={true} className={classes.autocompleteTypography}>
        {this.renderHighlightedAutocompleteEntry(
          highlightInformation,
          autocompleteEntry
        )}
      </Typography>
    );
  };

  renderSearchResultList = () => {
    const { resultPanelCollapsed } = this.state;
    const { searchResults, app, map, localObserver } = this.props;

    return (
      <SearchResultsContainer
        searchResults={searchResults}
        localObserver={localObserver}
        app={app}
        getOriginBasedIcon={this.getOriginBasedIcon}
        featureCollections={searchResults.featureCollections}
        map={map}
        panelCollapsed={resultPanelCollapsed}
      />
    );
  };

  renderAutoComplete = () => {
    const {
      autocompleteList,
      autoCompleteOpen,
      searchString,
      searchActive,
      classes,
      loading,
      handleOnAutoCompleteInputChange,
      handleSearchInput,
    } = this.props;
    return (
      <Autocomplete
        id="searchInputField"
        freeSolo
        size={"small"}
        classes={{
          inputRoot: classes.inputRoot, // class name, e.g. `classes-nesting-root-x`
        }}
        PopperComponent={CustomPopper}
        clearOnEscape
        disabled={searchActive === "draw"}
        autoComplete
        value={searchString}
        selectOnFocus
        open={autoCompleteOpen}
        disableClearable
        onChange={handleSearchInput}
        onInputChange={handleOnAutoCompleteInputChange}
        getOptionSelected={(option, value) =>
          option.autocompleteEntry === value.autocompleteEntry
        }
        renderOption={(option) => {
          if (searchString.length > 0) {
            return (
              <>
                {this.getOriginBasedIcon(option.origin)}
                {this.getHighlightedACE(searchString, option.autocompleteEntry)}

                <FormHelperText>{option.dataset}</FormHelperText>
              </>
            );
          }
        }}
        getOptionLabel={(option) => option?.autocompleteEntry || option}
        options={autocompleteList}
        loading={loading}
        renderInput={this.renderAutoCompleteInputField}
      />
    );
  };

  renderAutoCompleteInputField = (params) => {
    const {
      searchString,
      loading,
      width,
      searchActive,
      map,
      app,
      handleOnClear,
      showSearchResults,
      handleSearchBarKeyPress,
      searchOptions,
      searchSources,
      updateSearchOptions,
      searchModel,
      handleOnClickOrKeyboardSearch,
      setSearchSources,
    } = this.props;
    const disableUnderline = width === "xs" ? { disableUnderline: true } : null;
    return (
      <TextField
        {...params}
        label={undefined}
        variant={width === "xs" ? "standard" : "outlined"}
        placeholder="Sök..."
        onKeyPress={handleSearchBarKeyPress}
        InputProps={{
          ...params.InputProps,
          ...disableUnderline,
          endAdornment: (
            <>
              {loading ? <CircularProgress color="inherit" size={20} /> : null}
              {params.InputProps.endAdornment}
              <IconButton size="small" onClick={handleOnClickOrKeyboardSearch}>
                <Typography variant="srOnly">Exekvera sökning</Typography>
                <SearchIcon />
              </IconButton>
              {searchString.length > 0 ||
              showSearchResults ||
              searchActive !== "" ? (
                <IconButton onClick={handleOnClear} size="small">
                  <Typography variant="srOnly">Rensa sökfält</Typography>
                  <ClearIcon />
                </IconButton>
              ) : (
                <SearchTools
                  map={map}
                  searchSources={searchSources}
                  setSearchSources={setSearchSources}
                  app={app}
                  searchOptions={searchOptions}
                  searchTools={this.props.searchTools}
                  searchModel={searchModel}
                  updateSearchOptions={updateSearchOptions}
                />
              )}
            </>
          ),
        }}
      />
    );
  };

  renderSelectSearchOptions = () => {
    const { selectSourcesOpen } = this.state;
    const { classes, searchModel, searchSources } = this.props;
    return (
      <Autocomplete
        className={cslx(selectSourcesOpen === false ? classes.hidden : null)}
        onChange={(event, value, reason) => this.props.setSearchSources(value)}
        value={searchSources}
        multiple
        id="searchSources"
        options={searchModel.getSources()}
        disableCloseOnSelect
        getOptionLabel={(option) => option.caption}
        renderOption={(option, { selected }) => (
          <>
            <Checkbox
              icon={<CheckBoxOutlineBlankIcon fontSize="small" />}
              checkedIcon={<CheckBoxIcon fontSize="small" />}
              style={{ marginRight: 8 }}
              checked={selected}
            />
            {option.caption}
          </>
        )}
        style={{ width: 400 }}
        renderInput={(params) => (
          <TextField
            {...params}
            variant="outlined"
            // label="Sökkällor"
            placeholder="Välj sökkälla"
          />
        )}
      />
    );
  };

  render() {
    const { classes, showSearchResults, width } = this.props;
    const { panelCollapsed } = this.state;

    return (
      <Grid
        className={cslx(classes.searchContainer, {
          [classes.searchCollapsed]: panelCollapsed,
        })}
      >
        <Grid item>
          <Paper elevation={width === "xs" ? 0 : 1}>
            {this.renderAutoComplete()}

            {this.renderSelectSearchOptions()}
          </Paper>
        </Grid>
        {showSearchResults && this.renderSearchResultList()}
      </Grid>
    );
  }
}

export default withStyles(styles)(withTheme(withWidth()(SearchBar)));
