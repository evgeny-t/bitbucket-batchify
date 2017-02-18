import './styles.css';
import * as bb from './bb';

function parse(str) {
  const entries = str.match(/(\w+):(("[^"]*")|("?[^"\s]*"?))/g);
  return entries ? entries
    .map(entry => {
      const match = entry.match(/(\w+):(?:"([^"]*)"|"?([^"]*)"?)/);
      return [match[1], match[2] === undefined ? match[3] : match[2]];
    })
    .reduce((a, v) => {
      let re;
      try {
        re = new RegExp(v[1], 'i');
      } catch (e) {
        re = v[1];
      }

      a[v[0].toLowerCase()] = re;
      return a;
    }, {}) : {};
}

class Store {
  @mobx.observable filterString = '';
  @mobx.observable rows = [];

  @mobx.observable inProgress = false;
  @mobx.observable progress = 0.0;

  @mobx.computed get anySelected() {
    return this.rows.map(row => row.checked)
      .reduce((a, c) => a || c, false);
  }

  @mobx.computed get filters() {
    return parse(this.filterString);
  }

  @mobx.computed get filteredRows() {
    const filters = this.filters;
    const match = (what, filter) =>
      typeof(filter) === 'string' ?
        (what.toLowerCase().indexOf(filter.toLowerCase()) >= 0) :
        what.match(filter);
    return this.rows.filter(row => {
      for (let f in filters) {
        if (typeof(row[f]) === 'string' && !match(row[f], filters[f])) {
          return false;
        }
      }

      return true;
    });
  }

  @mobx.action updateAll(key, value) {
    this.inProgress = true;
    this.progress = 0.0;
    return Promise.resolve(
      this.filteredRows.filter(row => row.checked))
    .then(mobx.action(rows => {
      return rows.map(mobx.action((row, i) => {
        row[key] = value;
        return () => row.save()
          .then(() => this.progress = (i + 1) / rows.length);
      }))
      .reduce((acc, cur) => {
        return acc.then(cur);
      }, Promise.resolve())
    }))
    .then(() => this.inProgress = false)
    .catch(() => this.inProgress = false);
  }

  @mobx.action setPriority(priority) {
    this.updateAll('priority', priority);
  }

  @mobx.action setKind(kind) {
    this.updateAll('kind', kind);
  }
}

class Row {
  id = null;
  @mobx.observable title = null;
  @mobx.observable kind = null;
  @mobx.observable priority = 'minor';
  @mobx.observable status = 'new';
  @mobx.observable assignee = '';
  @mobx.observable milestone = '';
  @mobx.observable version = '';
  created = null;
  updated = null;

  @mobx.observable checked = false;
  @mobx.observable isBeingUpdated = false;

  constructor(args) {
    Object.assign(this, args);
  }

  @mobx.action save() {
    this.isBeingUpdated = true;
    return bb.updateIssue(this.id, {
      title: this.title,
      kind: this.kind,
      priority: this.priority,
      status: this.status,
      assignee: this.assignee,
      milestone: this.milestone,
      version: this.version,
    })
    .then(arg => {
      this.isBeingUpdated = false;
      return arg;
    })
    .catch(error => {
      this.isBeingUpdated = false;
      throw error;
    });
  }
}

var store = new Store();

mobx.reaction(() => store.filterString, (filterString) => {
  // console.log('reaction () => store.filterString', filterString);
  // console.log(parse(filterString))
});

mobx.reaction(() => store.filteredRows, rows => {
  // console.log('filtered: ', rows);
});


function listIssues(page=1) {
  return bb.issues(page)
    .then(data => {
      const issues = data.values.map(i =>
        new Row({
          id: i.id,
          title: i.title,
          kind: i.kind,
          priority: i.priority,
        }));
      store.rows = store.rows.concat(issues);
      if (data.next) {
        return listIssues(page + 1);
      }
    });
}

listIssues();
bb.updateIssue(1, {
  title: 'first bug - 1',
});

@mobxReact.observer
class Progress extends React.Component {
  componentWillReceiveProps(next) {
    AJS.progressBars.update(`#${this.props.name}`, next.progress);
  }

  render() {
    return (
      <div id={this.props.name} className="aui-progress-indicator">
        <span className="aui-progress-indicator-value"></span>
      </div>
    );
  }
}

@mobxReact.observer
class EditPanel extends React.Component {
  render() {
    return (
      <div>
        {
          (this.props.store.inProgress) && (
            <Progress
              progress={this.props.store.progress}
              name="progress-indicator"
            />)
        }
        <div style={{ width: '100%', display: 'flex' }}>
          <input itemType="primary" type="text"
            className="text long-field"
            id="filter-input" name="filter-input"
            placeholder='Type in criteria: title:"chrome" kind:bug priority:minor'
            onChange={e => this.props.store.filterString = e.target.value}
            />
          <Toolbar style={{ minWidth: 150, }}>
            <Dropdown itemType="secondary" text="Priority" name="priority"
              items={['trivial', 'minor', 'major', 'critical', 'blocker']}
              onClick={item => this.props.store.setPriority(item)}
             />
            <Dropdown itemType="secondary" text="Type" name="type"
              items={['bug', 'enhancement', 'proposal', 'task']}
              onClick={item => this.props.store.setKind(item)}
             />
          </Toolbar>
        </div>
      </div>
    );
  }
}

class Toolbar extends React.Component {
  render() {
    return (
      <div style={this.props.style} className="aui-toolbar2" role="toolbar">
        <div className="aui-toolbar2-inner">
          {
            React.Children.map(this.props.children, c => (
              <div className={`aui-toolbar2-${c.props.itemType}`}>{c}</div>))
          }
        </div>
      </div>);
  }
}

class Dropdown extends React.Component {
  render() {
    const id = `dropdown-${this.props.name}`;
    return (
      <div>
        <a href={`#${id}`} aria-owns={id} aria-haspopup="true" className="aui-button aui-style-default aui-dropdown2-trigger">{this.props.text}</a>
        <div id={id} className="aui-style-default aui-dropdown2">
          <ul className="aui-list-truncate">
            {this.props.items.map(item => (
              <li>
                <a href="#" onClick={() => this.props.onClick(item)}>
                  {item}
                </a>
              </li>
            ))}
          </ul>
        </div>
      </div>
    );
  }
}

@mobxReact.observer
class Table extends React.Component {
  render() {
    const selectedRowStyle = {
      backgroundColor: '#f5f5f5',
    };
    const rowStyle = {
    };
    const renderRows = () =>
      this.props.store.filteredRows.map((row, i) => {
        return (
          <tr style={row.checked ? selectedRowStyle : rowStyle}
            onClick={e => row.checked = !row.checked}
           >
            <td>
              <input type="checkbox" checked={row.checked}
                onChange={e => row.checked = e.target.checked}
              />
            </td>
            <td>{row.title}</td>
            <td>{row.kind}</td>
            <td>{row.priority}</td>
            {/*<td>{row.status}</td>
            <td>{row.assignee}</td>
            <td>{row.milestone}</td>
            <td>{row.version}</td>
            <td>{row.created}</td>
            <td>{row.updated}</td>*/}
          </tr>
        );
      });

    return (
      <div>
        <EditPanel {...this.props} />
        <table className="aui aui-table-interactive">
          <thead>
            <tr>
              <th className='table--checkbox'></th>
              <th className='table--title'>Title</th>
              <th className='table--type'>T</th>
              <th className='table--priority'>P</th>
              {/*<th>Status</th>
              <th>Assignee</th>
              <th>Milestone</th>
              <th>Version</th>
              <th>Created</th>
              <th>Updated</th>*/}
            </tr>
          </thead>
          <tbody>
            {renderRows()}
          </tbody>
        </table>
       </div>
    );
  }
}

ReactDOM.render((<Table store={store} />), document.getElementById('root'))


