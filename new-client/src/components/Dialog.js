import React, { Component } from "react";
import propTypes from "prop-types";
import { withStyles } from "@material-ui/core/styles";
import Button from "@material-ui/core/Button";

import ReactDialog from "@material-ui/core/Dialog";
import DialogActions from "@material-ui/core/DialogActions";
import DialogContent from "@material-ui/core/DialogContent";
import DialogContentText from "@material-ui/core/DialogContentText";
import DialogTitle from "@material-ui/core/DialogTitle";
import TextField from "@material-ui/core/TextField";

const styles = theme => ({
  container: {
    display: "flex",
    flexWrap: "wrap"
  },
  textField: {
    marginLeft: theme.spacing(1),
    marginRight: theme.spacing(1),
    width: 200
  },
  dense: {
    marginTop: 19
  },
  menu: {
    width: 200
  }
});

class Dialog extends Component {
  state = {
    open: false,
    text: ""
  };

  static propTypes = {
    classes: propTypes.object.isRequired,
    onClose: propTypes.func.isRequired,
    open: propTypes.bool.isRequired,
    options: propTypes.object.isRequired
  };

  /*
   * If the lifecycle of the component is not controlled by itself
   * the render method can be used to make the component
   * update its state when props changes.
   *
   * It is not recommended to mutate the state of this component
   * if the keys have the same name, it will duplicate the update event and
   * the last prop value will be taken.
   *
   * NOTE: this method is considered safer than using legacy componentWillRecieveProps.
   *
   * @param {object} props - new props
   * @param {object} state - current state
   * @return {object} state - updated state
   */
  static getDerivedStateFromProps(props, state) {
    return {
      open: props.open
    };
  }

  handleChange = name => event => {
    this.setState({
      [name]: event.target.value
    });
  };

  handleClose = e => {
    e.stopPropagation();
    this.props.onClose(this.state.text);
  };

  handleAbort = e => {
    e.stopPropagation();
    this.props.onAbort(this.state.text);
  };

  handleDialogClick = e => {
    e.stopPropagation();
    return false;
  };

  getHtml(text) {
    return {
      __html: text
    };
  }

  renderDialogContent(text) {
    if (typeof text === "string") {
      return (
        <DialogContentText>
          <span dangerouslySetInnerHTML={this.getHtml(text)} />
        </DialogContentText>
      );
    } else {
      return text;
    }
  }

  renderPromptInput() {
    const { classes, options } = this.props;
    if (!options.prompt) return null;

    return (
      <form
        className={classes.container}
        noValidate
        autoComplete="off"
        onSubmit={e => {
          e.preventDefault();
          this.props.onClose(this.state.text);
          return false;
        }}
      >
        <TextField
          id="prompt-text"
          label=""
          className={classes.textField}
          value={this.state.text}
          onChange={this.handleChange("text")}
          margin="normal"
          autoFocus={true}
        />
      </form>
    );
  }

  render() {
    const { options } = this.props;

    var text = "",
      header = "";

    if (options) {
      header = options.headerText;
      text = options.text;
    }

    var fullScreen = document.body.clientWidth < 600;

    return (
      <ReactDialog
        fullScreen={fullScreen}
        open={this.state.open}
        onClose={this.handleClose}
        aria-labelledby="responsive-dialog-title"
      >
        <DialogTitle id="responsive-dialog-title">{header}</DialogTitle>
        <DialogContent>
          {this.renderDialogContent(text)}
          {this.renderPromptInput()}
        </DialogContent>
        <DialogActions>
          <Button onClick={this.handleClose} color="primary" autoFocus>
            {options.buttonText || "Stäng"}
          </Button>
          {options.abortText ? (
            <Button onClick={this.handleAbort} color="primary" autoFocus>
              {options.abortText}
            </Button>
          ) : null}
        </DialogActions>
      </ReactDialog>
    );
  }
}

export default withStyles(styles)(Dialog);
