import React from "react";
import PropTypes from "prop-types";
import { styled } from "@mui/material/styles";
import Button from "@mui/material/Button";
import TextField from "@mui/material/TextField";
import Box from "@mui/material/Box";

import AddCircleOutlineIcon from "@mui/icons-material/AddCircleOutline";
import BookmarkIcon from "@mui/icons-material/Bookmark";
import BookmarkOutlinedIcon from "@mui/icons-material/BookmarkBorderOutlined";
import DeleteIcon from "@mui/icons-material/Delete";
import IconButton from "@mui/material/IconButton";
import Typography from "@mui/material/Typography";

import ConfirmationDialog from "../../components/ConfirmationDialog";

const List = styled("div")(() => ({
  display: "flex",
  flex: "1 0 100%",
  flexFlow: "column nowrap",
  marginTop: "10px",
}));

const ListItem = styled("div")(({ theme }) => ({
  display: "flex",
  position: "relative",
  flex: "1 0 100%",
  justifyContent: "flex-start",
  border: `1px solid ${theme.palette.grey[400]}`,
  transform: "translateZ(1px)",
  borderBottom: "none",
  "&:first-of-type": {
    borderRadius: "3px 3px 0 0",
  },
  "&:last-child": {
    borderBottom: `1px solid ${theme.palette.grey[400]}`,
    borderRadius: "0 0 3px 3px",
  },
}));

const AddButton = styled(Button)(() => ({
  flex: "1 0 auto",
  whiteSpace: "nowrap",
  height: "0%",
  top: "-22px",
  marginLeft: "10px",
}));

const BookmarkButton = styled(Button)(({ theme }) => ({
  display: "flex",
  justifyContent: "flex-start",
  flex: "1 0 100%",
  transform: "translateZ(1px)",
  "& svg": {
    color: theme.palette.text.secondary,
  },
  "&:hover svg.on": {
    opacity: 0.7,
  },
}));

const DeleteButton = styled(IconButton)(({ theme }) => ({
  display: "block",
  position: "absolute",
  top: 0,
  right: 0,
  padding: "5px",
  width: "36px",
  height: "36px",
  borderRadius: "100% 0 0 100%",
  "&:hover svg": {
    color: theme.palette.error.dark,
    stoke: theme.palette.error.dark,
    fill: theme.palette.error.dark,
  },
}));

const BookmarkIconSpan = styled("span")(({ theme }) => ({
  display: "inline-block",
  position: "relative",
  width: "24px",
  height: "24px",
  marginRight: "8px",
  "& .on": {
    position: "absolute",
    top: "0",
    left: "0",
    width: "24px",
    height: "24px",
    color: theme.palette.text.secondary,
    stoke: theme.palette.text.secondary,
    fill: theme.palette.text.secondary,
    opacity: 0.001,
    transition: "all 300ms",
  },
}));

const ItemNameSpan = styled("span")(() => ({
  whiteSpace: "nowrap",
  overflow: "hidden",
  textOverflow: "ellipsis",
  maxWidth: "calc(100% - 71px)",
  textTransform: "none",
}));

const StyledDeleteIcon = styled(DeleteIcon)(() => ({
  display: "block",
  width: "24px",
  height: "24px",
  transition: "all 300ms",
}));

class BookmarksView extends React.PureComponent {
  state = {
    name: "",
    error: false,
    helperText: " ",
    bookmarks: [],
    showRemovalConfirmation: false,
    bookmarkToDelete: null,
  };

  static propTypes = {
    model: PropTypes.object.isRequired,
    app: PropTypes.object.isRequired,
  };

  static defaultProps = {};

  constructor(props) {
    super(props);
    this.model = this.props.model;
    this.state.bookmarks = [...this.model.bookmarks];
    this.handleKeyUp = this.handleKeyUp.bind(this);
    this.handleRemoveConfirmation = this.handleRemoveConfirmation.bind(this);
    this.handleRemoveConfirmationAbort =
      this.handleRemoveConfirmationAbort.bind(this);
  }

  btnAddBookmark = (e) => {
    if (this.state.name.trim() === "") {
      return;
    }

    this.model.addBookmark(this.state.name, true);

    this.setState({
      name: "",
      bookmarks: [...this.model.bookmarks],
    });
    this.checkBookmarkName("");
  };

  btnOpenBookmark(bookmark) {
    this.model.setMapState(bookmark);
  }

  btnHandleRemoveModal(bookmark) {
    this.setState({ showRemovalConfirmation: true });
    this.setState({ bookmarkToDelete: bookmark });
  }

  handleRemoveConfirmation() {
    this.deleteBookmark(this.state.bookmarkToDelete);
    this.setState({ showRemovalConfirmation: false });
  }

  handleRemoveConfirmationAbort() {
    this.setState({ showRemovalConfirmation: false });
  }

  deleteBookmark(bookmark) {
    this.model.removeBookmark(bookmark);
    this.setState({ bookmarks: [...this.model.bookmarks] });
  }

  checkBookmarkName(name) {
    if (name.trim() === "") {
      this.setState({
        error: false,
        helperText: " ",
      });
      return false;
    }

    let exists = this.model.bookmarkWithNameExists(name);

    this.setState({
      error: exists ? true : false,
      helperText: exists
        ? `Namnet upptaget. Ersätt bokmärke "${this.state.name}"?`
        : " ",
    });

    return exists ? false : true;
  }

  handleChange = (name) => (event) => {
    this.setState({
      [name]: event.target.value,
    });
  };

  handleKeyUp(e) {
    this.checkBookmarkName(e.target.value);

    if (e.nativeEvent.keyCode === 13 /* Enter, yes we all know... */) {
      this.btnAddBookmark();
    }
  }

  refreshBookmarks() {
    this.setState({ bookmarks: [...this.model.bookmarks] });
  }

  render() {
    return (
      <div>
        <Typography sx={{ marginBottom: 1 }}>
          Skapa ett bokmärke med kartans synliga lager, aktuella zoomnivå och
          utbredning.
        </Typography>
        <Box
          sx={{
            display: "flex",
            flexFlow: "row nowrap",
            alignItems: "flex-end",
          }}
        >
          <TextField
            placeholder="Skriv bokmärkets namn"
            label="Namn"
            value={this.state.name}
            onChange={this.handleChange("name")}
            onKeyUp={this.handleKeyUp}
            error={this.state.error}
            helperText={this.state.helperText}
            sx={{ flex: "0 1 100%", height: "0%" }}
            variant="standard"
          ></TextField>
          <AddButton
            variant="contained"
            color="primary"
            size="small"
            startIcon={this.state.error ? null : <AddCircleOutlineIcon />}
            onClick={this.btnAddBookmark}
          >
            {this.state.error ? "Ersätt" : "Lägg till"}
          </AddButton>
        </Box>

        <List>
          {this.state.bookmarks.map((item, index) => (
            <ListItem key={index + "_" + item.name}>
              <BookmarkButton
                onClick={() => {
                  this.btnOpenBookmark(item);
                }}
              >
                <BookmarkIconSpan>
                  <BookmarkOutlinedIcon />
                  <BookmarkIcon className="on" />
                </BookmarkIconSpan>
                <ItemNameSpan>{item.name}</ItemNameSpan>
              </BookmarkButton>
              <DeleteButton
                aria-label="Ta bort"
                onClick={() => {
                  this.btnHandleRemoveModal(item);
                }}
                size="large"
              >
                <StyledDeleteIcon fontSize="small" />
              </DeleteButton>
            </ListItem>
          ))}
          <ConfirmationDialog
            open={this.state.showRemovalConfirmation === true}
            titleName={"Radera bokmärke"}
            contentDescription={
              "Är du säker på att du vill radera bokmärket? Detta går inte att ångra."
            }
            cancel={"Avbryt"}
            confirm={"Radera"}
            handleConfirm={this.handleRemoveConfirmation}
            handleAbort={this.handleRemoveConfirmationAbort}
          />
        </List>
      </div>
    );
  }
}

export default BookmarksView;
