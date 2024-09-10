import React from "react";
import { styled } from "@mui/material/styles";
import Paper from "@mui/material/Paper";
import VirtualizedTable from "./VirtualizedTable";

const StyledPaper = styled(Paper)(({ theme }) => ({
  height: 240,
  boxShadow: "none",
}));

/**
 * @summary Table used to show summary for journeys
 * @description Table used to show a summary when the user search
 * for the type Journeys
 * @class SummaryTable
 * @extends {React.Component}
 */
class SummaryTable extends React.Component {
  state = {
    rows: this.props.rows,
  };

  render = () => {
    const { rowHeight, columns, height } = this.props;

    return (
      <StyledPaper style={{ height: `${height}px` }}>
        <VirtualizedTable
          rowCount={this.state.rows.length}
          rowHeight={rowHeight}
          rowGetter={({ index }) => this.state.rows[index]}
          columns={columns}
          sortable={false}
        />
      </StyledPaper>
    );
  };
}

export default SummaryTable;
