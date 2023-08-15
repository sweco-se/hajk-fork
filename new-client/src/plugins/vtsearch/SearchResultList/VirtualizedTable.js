import React from "react";
import { useTheme } from "@mui/material";
import { styled } from "@mui/material/styles";
import TableCell from "@mui/material/TableCell";
import { AutoSizer, Column, Table } from "react-virtualized";
import { SortIndicator } from "react-virtualized";
import "react-virtualized/styles.css";
import { Typography, Tooltip } from "@mui/material";

// const styles = (theme) => ({
//   flexContainer: {
//     display: "flex",
//     alignItems: "center",
//     boxSizing: "border-box",
//   },

//   table: {
//     // temporary right-to-left patch, waiting for
//     // https://github.com/bvaughn/react-virtualized/issues/454
//     "& .ReactVirtualized__Table__headerRow": {
//       flip: false,
//       overflow: "auto",
//       borderBottom: `1px solid ${theme.palette.common.black}`,
//       textTransform: "none",
//       padding: theme.spacing(0),
//       paddingRight: theme.direction === "rtl" ? "0px !important" : undefined,
//     },
//   },

//   tableRowHover: {
//     "&:hover": {
//       backgroundColor: theme.palette.grey[200],
//     },
//   },

//   tableRow: {
//     cursor: "pointer",
//     border: `1px solid ${theme.palette.grey[200]}`,
//     whiteSpace: "wrap",
//     outline: "none",
//   },
//   tableRowSelected: {
//     background: theme.palette.primary.main,
//   },
//   headerColumn: {
//     whiteSpace: "pre-wrap",
//     alignItems: "center",
//     boxSizing: "border-box",
//     justifyContent: "flex-start",
//     cursor: "pointer",
//     display: "flex",
//     paddingTop: theme.spacing(0),
//     paddingRight: theme.spacing(0),
//     paddingBottom: theme.spacing(0),
//     minWidth: theme.spacing(0),
//     lineHeight: 1,
//     borderBottom: theme.spacing(0),
//   },
//   columnStyle: {
//     whiteSpace: "pre-wrap",
//     alignItems: "center",
//     boxSizing: "border-box",
//     justifyContent: "center",
//     cursor: "pointer",
//     wordBreak: "break-all",
//     borderBottom: theme.spacing(0),
//   },
//   rowCell: {
//     marginRight: 0,
//     border: "none",
//     borderBottom: 0,
//     textAlign: "center",
//     flex: 1,
//   },
// });

const StyledTable = styled(Table)(({ theme }) => ({
  "& .ReactVirtualized__Table__headerRow": {
    flip: false,
    overflow: "auto",
    borderBottom: `1px solid ${theme.palette.common.black}`,
    textTransform: "none",
    padding: theme.spacing(0),
    paddingRight: theme.direction === "rtl" ? "0px !important" : undefined,
  },
  "& .ReactVirtualized__Table__row": {
    cursor: "pointer",
    borderBottom: `2px solid ${theme.palette.grey[200]}`,
    "&:hover": {
      backgroundColor: theme.palette.grey[500],
    },
  },
}));

const StyledTableRow = () => {
  const theme = useTheme();
  return {
    backgroundColor: theme.palette.primary.light,
  };
};

const StyledTableCellForCell = styled(TableCell)(({ theme }) => ({
  marginRight: 0,
  border: "none",
  borderBottom: 0,
  textAlign: "center",
  flex: 1,
}));

const StyledTableCellForHeader = styled(TableCell)(({ theme }) => ({
  whiteSpace: "pre-wrap",
  alignItems: "center",
  boxSizing: "border-box",
  justifyContent: "flex-start",
  cursor: "pointer",
  display: "flex",
  paddingTop: theme.spacing(0),
  paddingRight: theme.spacing(0),
  paddingBottom: theme.spacing(0),
  minWidth: theme.spacing(0),
  lineHeight: 1,
  borderBottom: theme.spacing(0),
}));

const headerRowIndex = -1;

/**
 * @summary VirtualizedTable is the core class to handle the table used in Attribute Table
 * @description VirtualizedTable uses React Virtualized to render large lists in a smart way to boost performance.
 * @class VirtualizedTable
 * @extends {React.PureComponent}
 */

class VirtualizedTable extends React.PureComponent {
  static defaultProps = {
    headerHeight: 40,
    rowHeight: 30,
    sortable: true,
    selectedRow: headerRowIndex,
  };

  state = {
    index: -1,
  };

  /**
   * Handles the click on a table row.
   * @param {event} event
   */
  #handleRowSelect = (event) => {
    const { rowClicked } = this.props;
    rowClicked(event);

    this.setState({
      index: event.index,
    });
  };

  /**
   * Handles the styling of the table row. A selected row has a specific color.
   * @param {object} row
   * @returns Returns a styling for the row.
   */
  #rowStyleClickedRow = (row) => {
    const { scrollToIndex } = this.props;

    if (row.index < 0) return;
    if (
      this.state.index === row.index ||
      (row.index === scrollToIndex && this.state.index === -1)
    )
      return {
        backgroundColor: "#0096ed", // Only accepts rgb codes, not from theme
      };

    return StyledTableRow;
  };

  #getColumn = (dataKey, index, other) => {
    return (
      dataKey !== "id" && (
        <Column
          key={dataKey}
          headerRenderer={(headerProps) =>
            this.#headerRenderer({
              ...headerProps,
              columnIndex: index,
            })
          }
          cellRenderer={this.#cellRenderer}
          dataKey={dataKey}
          {...other}
        />
      )
    );
  };

  #cellRenderer = ({ cellData, columnIndex, rowData }) => {
    const { columns } = this.props;

    if (cellData == null) return "";
    return (
      <>
        <Tooltip disableInteractive title={cellData}>
          <StyledTableCellForCell
            component="div"
            variant="body"
            align={
              (columnIndex != null && columns[columnIndex].numeric) || false
                ? "right"
                : "left"
            }
          >
            {cellData}
          </StyledTableCellForCell>
        </Tooltip>
      </>
    );
  };

  #headerRenderer = ({ label, columnIndex, sortDirection }) => {
    const { columns, sortable } = this.props;

    return (
      <StyledTableCellForHeader
        component="div"
        variant="head"
        align={columns[columnIndex].numeric || false ? "right" : "left"}
      >
        <Typography variant="caption">{label}</Typography>

        {sortable && <SortIndicator sortDirection={sortDirection} />}
      </StyledTableCellForHeader>
    );
  };

  render() {
    const { columns, rowHeight, rowClicked, headerHeight, ...tableProps } =
      this.props;
    return (
      <AutoSizer>
        {({ height, width }) => (
          <StyledTable
            height={height}
            width={width}
            rowHeight={rowHeight}
            headerHeight={headerHeight}
            onRowClick={this.#handleRowSelect.bind(this)}
            rowStyle={this.#rowStyleClickedRow.bind(this)}
            {...tableProps}
          >
            {columns.map(({ dataKey, ...other }, index) => {
              return (
                index !== headerRowIndex &&
                this.#getColumn(dataKey, index, other)
              );
            })}
          </StyledTable>
        )}
      </AutoSizer>
    );
  }
}

export default VirtualizedTable;
