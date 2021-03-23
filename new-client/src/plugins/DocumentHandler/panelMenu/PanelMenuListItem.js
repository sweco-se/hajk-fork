import React from "react";
import { withStyles, withTheme } from "@material-ui/core/styles";
import Icon from "@material-ui/core/Icon";
import ListItem from "@material-ui/core/ListItem";
import Collapse from "@material-ui/core/Collapse";
import ListItemText from "@material-ui/core/ListItemText";
import ListItemIcon from "@material-ui/core/ListItemIcon";
import ExpandLess from "@material-ui/icons/ExpandLess";
import PanelList from "./PanelList";
import ExpandMore from "@material-ui/icons/ExpandMore";
import { Typography } from "@material-ui/core";

const styles = (theme) => ({
  listItem: { overflowWrap: "break-word" },
  listItemIcon: { minWidth: theme.spacing(3) },
  collapseIconRoot: { minWidth: theme.spacing(4) },
  root: {
    borderLeft: `${theme.spacing(1)}px solid ${theme.palette.background.paper}`,
    "&.Mui-selected": {
      borderLeftColor: theme.palette.action.selected,
    },
    "&.Mui-selected:hover": {
      borderLeftColor: theme.palette.action.selected,
    },
    "&:hover": {
      borderColor: theme.palette.action.hover,
    },
  },
});

class PanelMenuListItem extends React.PureComponent {
  #getListTitle = () => {
    const { title } = this.props;
    return <ListItemText>{title}</ListItemText>;
  };

  #getCollapseIcon = () => {
    const { classes, title, expanded } = this.props;

    return expanded ? (
      <ListItemIcon classes={{ root: classes.collapseIconRoot }}>
        {!title && <Typography variant="srOnly">Minimera submeny</Typography>}
        <ExpandLess />
      </ListItemIcon>
    ) : (
      <ListItemIcon classes={{ root: classes.collapseIconRoot }}>
        {!title && <Typography variant="srOnly">Maximera submeny</Typography>}
        <ExpandMore />
      </ListItemIcon>
    );
  };

  #getListIcon = () => {
    const { classes, title, icon } = this.props;
    return (
      <ListItemIcon className={classes.listItemIcon}>
        {!title && (
          <Typography variant="srOnly">{icon.descriptiveText}</Typography>
        )}
        <Icon style={{ fontSize: icon.fontSize }}>
          {icon.materialUiIconName}
        </Icon>
      </ListItemIcon>
    );
  };

  #hasSubMenu = () => {
    const { subMenuItems } = this.props;
    return subMenuItems && subMenuItems.length > 0;
  };

  #handleMenuButtonClick = (type, id) => {
    const { localObserver } = this.props;
    localObserver.publish(`${type}-clicked`, id);
  };

  #getMenuItemStyle = () => {
    const { theme, level, color, colored } = this.props;
    const hasSubMenu = this.#hasSubMenu();
    return colored
      ? {
          paddingLeft: theme.spacing(1) + theme.spacing(level * 3),
          borderLeft: `${theme.spacing(1)}px solid ${color}`,
          paddingRight: hasSubMenu ? 0 : theme.spacing(1),
        }
      : {
          paddingLeft: theme.spacing(1) + theme.spacing(level * 3),
          paddingRight: hasSubMenu ? 0 : theme.spacing(1),
        };
  };

  render() {
    const {
      classes,
      type,
      selected,
      subMenuItems,
      expanded,
      icon,
      level,
      title,
      id,
    } = this.props;
    const hasSubMenu = this.#hasSubMenu();
    return (
      <>
        <ListItem
          divider
          selected={selected}
          button
          ref={this.props.itemRef}
          size="small"
          classes={{
            root: classes.root,
          }}
          disableGutters
          aria-controls={hasSubMenu ? `submenu_${id}` : null}
          aria-expanded={expanded}
          onClick={() => {
            this.#handleMenuButtonClick(type, id);
          }}
          className={classes.listItem}
          style={this.#getMenuItemStyle()}
        >
          {icon ? this.#getListIcon() : null}
          {title && this.#getListTitle()}
          {hasSubMenu && this.#getCollapseIcon()}
        </ListItem>
        {hasSubMenu && (
          <Collapse
            id={`submenu_${id}`}
            in={expanded}
            onEnter={() => {
              this.props.onEnter(id);
            }}
            timeout={200}
          >
            <PanelList
              {...this.props}
              level={level + 1}
              items={subMenuItems}
            ></PanelList>
          </Collapse>
        )}
      </>
    );
  }
}

export default withStyles(styles)(withTheme(PanelMenuListItem));
