import React from "react";
import ReactDOM from "react-dom";
import {
  Button,
  Checkbox,
  Collapse,
  ControlLabel,
  FormControl,
  FormGroup,
  ProgressBar
} from "react-bootstrap";
import "./index.css";

const sport = root => root.sport;
const exercises = root => root.exercises;
const name = exercises => exercises.name;
const description = o => o.description;
const drills = exercises => exercises.drills;
const shortName = drill => drill.shortName;
const longName = drill => drill.longName;
const periods = root => root.periodsInMin;
const paces = root => root.paces;
const timeoutInSec = pace => pace.timeoutInSec;

function sortBy(array, selector) {
  return array.sort((a, b) => selector(a) - selector(b));
}

function reverseSortBy(array, selector) {
  return array.sort((a, b) => selector(b) - selector(a));
}

function minutesToSeconds(minutes) {
  return minutes * 60;
}

function secondsToMilliseconds(seconds) {
  return seconds * 1000;
}

function periodList(periods) {
  return periods.sort().map((period, index) =>
    <option value={period.toString()} key={index}>
      {period}
    </option>
  );
}

function paceList(paces, selectorKey, selectorValue) {
  return reverseSortBy(paces, selectorKey).map((pace, index) =>
    <option value={selectorKey(pace).toString()} key={index}>
      {selectorValue(pace)} ({selectorKey(pace).toString()} seconds per combo)
    </option>
  );
}

function shuffle(index, max) {
  if (max === 0 || max === 1) {
    return index;
  }

  let indexShuffled = index;
  while (index === indexShuffled) {
    indexShuffled = Math.floor(Math.random() * max);
  }
  return indexShuffled;
}

function exerciseList(exercises, choices) {
  return exercises
    .map((exercise, index) => [choices[index], exercise])
    .filter(tuple => tuple[0])
    .reduce((aggregate, tuple) => aggregate.concat(drills(tuple[1])), []);
}

function isAllUnchecked(array) {
  return !array.reduce(
    (aggregate, value) => (aggregate = aggregate || value),
    false
  );
}

function exerciseDefault(exercises) {
  return Array(exercises.length).fill(false);
}

function periodDefault(periods) {
  return periods.reduce((a, b) => Math.min(a, b));
}

function middle(array) {
  return timeoutInSec(
    sortBy(array, timeoutInSec)[Math.floor(array.length / 2)]
  );
}

function paceDefault(paces) {
  return middle(paces);
}

function Combo(props) {
  return (
    <div className="comboInner">
      <p className="comboShortName text-info">
        {shortName(props.combo)}
      </p>
      <p className="comboLongName">
        {longName(props.combo)}
      </p>
    </div>
  );
}

function Details(props) {
  return props.description
    ? <span className="tooltipRight">
        ({props.description})
      </span>
    : null;
}

function Checkboxes(props) {
  return (
    <Checkbox
      name={props.index}
      checked={props.checked}
      onChange={props.onChange}
    >
      {name(props.exercise)}
      <Details description={description(props.exercise)} />
    </Checkbox>
  );
}

function Select(props) {
  return (
    <FormGroup>
      <ControlLabel>
        {props.label}
        <Details description={props.description} />
      </ControlLabel>
      <FormControl
        componentClass="select"
        name={props.name}
        value={props.value}
        onChange={props.onChange}
      >
        {props.list(props.definition)}
      </FormControl>
    </FormGroup>
  );
}

class ProgressBarTicker extends React.Component {
  constructor(props) {
    super(props);

    this.period = secondsToMilliseconds(minutesToSeconds(props.period));
    this.tickInterval = 100;
    this.state = {
      current: 0
    };
  }

  componentDidMount() {
    this.timerId = setInterval(() => this.tick(), this.tickInterval);
  }

  componentWillUnmount() {
    clearInterval(this.timerId);
  }

  tick() {
    if (this.period <= this.state.current) {
      this.props.unmount();
      return;
    }

    const current = this.state.current + this.tickInterval;
    this.setState({
      current: current
    });
  }

  render() {
    const sessionPercentage = this.state.current / this.period * 100;
    return (
      <div>
        <ProgressBar now={sessionPercentage} />
      </div>
    );
  }
}

class ComboTicker extends React.Component {
  constructor(props) {
    super(props);

    this.pace = props.pace;
    this.sequence = props.sequence;
    this.state = {
      current: 1
    };
  }

  componentDidMount() {
    this.timerId = setInterval(
      () => this.tick(),
      secondsToMilliseconds(this.pace)
    );
  }

  componentWillUnmount() {
    clearInterval(this.timerId);
  }

  tick() {
    const current = shuffle(this.state.current, this.sequence.length);
    this.setState({
      current: current
    });
  }

  render() {
    const element = this.sequence[this.state.current % this.sequence.length];
    return <Combo combo={element} />;
  }
}

function Shadowboxing(props) {
  return (
    <div className="comboOuter">
      <ComboTicker pace={props.pace} sequence={props.sequence} />
      <ProgressBarTicker
        period={props.period}
        unmount={() => props.unmount()}
      />
    </div>
  );
}

function StartSession(props) {
  const noUserChoice = isAllUnchecked(props.exercises);
  const description = noUserChoice ? "Select drills to start" : "";

  return (
    <div>
      <Button
        bsStyle="default"
        className={noUserChoice ? "btn-warning" : "btn-success"}
        bsSize="large"
        disabled={noUserChoice}
        type="submit"
      >
        {props.label}
      </Button>
      <Details description={description} />
    </div>
  );
}

function MainTitle(props) {
  return (
    <h1>
      <a href=".">Shadow {props.sport}</a> &#x1f44a;
    </h1>
  );
}

class Session extends React.Component {
  constructor(props) {
    super(props);

    this.appFile = props.appFile;
    this.appDefinition = null;
    this.state = {
      exercises: null,
      periods: null,
      pace: null,
      shadowboxing: null
    };
  }

  componentDidMount() {
    const appDefinitionUrl = process.env.PUBLIC_URL + "/" + this.appFile;

    fetch(appDefinitionUrl)
      .then(response => {
        if (!response.ok) {
          throw new Error("Bad response from server");
        }
        return response.json();
      })
      .then(appDefinition => {
        this.appDefinition = appDefinition;
        this.setDefaultState(appDefinition);
      });
  }

  setDefaultState(appDefinition) {
    this.setState({
      exercises: exerciseDefault(exercises(appDefinition)),
      periods: periodDefault(periods(appDefinition)),
      pace: paceDefault(paces(appDefinition)),
      shadowboxing: null
    });
  }

  handleChangeSelect(event) {
    this.setState({ [event.target.name]: event.target.value });
  }

  handleChangeCheckbox(event) {
    const exercises = this.state.exercises.slice();
    exercises[parseInt(event.target.name, 10)] = event.target.checked;

    this.setState({ exercises: exercises });
  }

  handleStartShadowboxing(event) {
    event.preventDefault();

    const sequence = exerciseList(
      exercises(this.appDefinition),
      this.state.exercises
    );

    if (sequence.length === 0) {
      return;
    }

    const shadowboxing = (
      <Shadowboxing
        pace={this.state.pace}
        sequence={sequence}
        period={this.state.periods}
        unmount={() => this.handleEndShadowboxing()}
      />
    );

    this.setState({
      shadowboxing: shadowboxing
    });
  }

  handleEndShadowboxing() {
    this.setDefaultState(this.appDefinition);
  }

  renderAllExerciseChoices(exercises) {
    let choices = [];

    for (let i = 0; i < exercises.length; i++) {
      choices.push(
        <Checkboxes
          key={i}
          index={i}
          exercise={exercises[i]}
          checked={this.state.exercises[i]}
          onChange={event => this.handleChangeCheckbox(event)}
        />
      );
    }

    return (
      <FormGroup>
        <ControlLabel>Drills</ControlLabel>
        {choices}
      </FormGroup>
    );
  }

  render() {
    if (!this.appDefinition) {
      return <div />;
    }

    return (
      <div>
        <MainTitle sport={sport(this.appDefinition)} />

        <Collapse in={!this.state.shadowboxing}>
          <form onSubmit={event => this.handleStartShadowboxing(event)}>
            <fieldset disabled={this.state.shadowboxing}>
              {this.renderAllExerciseChoices(exercises(this.appDefinition))}

              <Select
                label={"Pick the training time"}
                description={"in minutes"}
                name="periods"
                value={this.state.periods}
                onChange={event => this.handleChangeSelect(event)}
                list={def => periodList(periods(def))}
                definition={this.appDefinition}
              />

              <Select
                label="Pick the speed"
                name="pace"
                value={this.state.pace}
                onChange={event => this.handleChangeSelect(event)}
                list={def => paceList(paces(def), timeoutInSec, description)}
                definition={this.appDefinition}
              />

              <StartSession exercises={this.state.exercises} label={"Start"} />
            </fieldset>
          </form>
        </Collapse>
        {this.state.shadowboxing}
      </div>
    );
  }
}

function Shadow(props) {
  return (
    <div>
      <Session appFile={props.appFile} />
    </div>
  );
}

ReactDOM.render(
  <Shadow appFile="kickboxing.json" />,
  document.getElementById("root")
);

// function Pre(props) {
//   return (
//     <div>
//       <pre>
//         {JSON.stringify(props.data)}
//       </pre>
//     </div>
//   );
// }
