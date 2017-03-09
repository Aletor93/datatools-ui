import Icon from '@conveyal/woonerf/components/icon'
import React, {Component, PropTypes} from 'react'
import { Row, Col, Button, Panel, Label, Glyphicon, ButtonToolbar, ListGroup, ListGroupItem } from 'react-bootstrap'
import moment from 'moment'
import { LinkContainer } from 'react-router-bootstrap'

import GtfsValidationViewer from './validation/GtfsValidationViewer'
// import GtfsValidationExplorer from './validation/GtfsValidationExplorer'
import FeedVersionReport from './FeedVersionReport'
import NotesViewer from './NotesViewer'
import ConfirmModal from '../../common/components/ConfirmModal'
import ActiveGtfsPlusVersionSummary from '../../gtfsplus/containers/ActiveGtfsPlusVersionSummary'
import { isModuleEnabled, getComponentMessages, getMessage } from '../../common/util/config'

export default class FeedVersionViewer extends Component {

  static propTypes = {
    version: PropTypes.object,
    feedSource: PropTypes.object,
    versions: PropTypes.array,
    feedVersionIndex: PropTypes.number,
    versionSection: PropTypes.string,

    isPublic: PropTypes.bool,
    hasVersions: PropTypes.bool,
    listView: PropTypes.bool,

    newNotePosted: PropTypes.func,
    notesRequested: PropTypes.func,
    fetchValidationResult: PropTypes.func,
    downloadFeedClicked: PropTypes.func,
    loadFeedVersionForEditing: PropTypes.func,
    validationJob: PropTypes.object
  }
  render () {
    const {
      version,
      feedVersionIndex,
      versionSection,
      feedSource,
      fetchValidationResult,
      user,
      validationJob,
      notesRequested,
      newNotePosted
    } = this.props
    const messages = getComponentMessages('FeedVersionViewer')

    if (!version) return <p className='text-center lead'>{getMessage(messages, 'noVersionsExist')}</p>

    if (this.props.listView) {
      // List view of feed versions
      return (
        <Row>
          <Col xs={12} sm={12}>
            <VersionList
              {...this.props}
            />
          </Col>
        </Row>
      )
    }

    switch (this.props.versionSection) {
      // case 'validation':
      //   return (
      //     <GtfsValidationExplorer
      //       {...this.props}
      //     />
      //   )
      default:
        return (
          <Row>
            <Col xs={12} sm={3}>
              <VersionSectionSelector
                version={version}
                feedVersionIndex={feedVersionIndex}
                validationJob={validationJob}
                versionSection={versionSection}
              />
            </Col>
            <Col xs={12} sm={9}>
              {!versionSection
                ? <FeedVersionReport
                  isPublished={version.id === feedSource.publishedVersionId}
                  {...this.props}
                />
                : versionSection === 'issues'
                ? <GtfsValidationViewer
                  validationResult={version.validationResult}
                  version={version}
                  fetchValidationResult={() => { fetchValidationResult(version) }}
                />
                : versionSection === 'gtfsplus' && isModuleEnabled('gtfsplus')
                ? <ActiveGtfsPlusVersionSummary
                  version={version}
                />
                : versionSection === 'comments'
                ? <NotesViewer
                  type='feed-version'
                  stacked
                  user={user}
                  version={version}
                  notes={version.notes}
                  noteCount={version.noteCount}
                  notesRequested={() => { notesRequested() }}
                  newNotePosted={(note) => { newNotePosted(note) }}
                />
                : null
              }
            </Col>
          </Row>
        )
    }
  }
}

export class VersionButtonToolbar extends Component {
  static propTypes = {
    version: PropTypes.object,
    versions: PropTypes.array,
    feedVersionIndex: PropTypes.number,
    // versionSection: PropTypes.string,

    isPublic: PropTypes.bool,
    hasVersions: PropTypes.bool,

    downloadFeedClicked: PropTypes.func,
    deleteFeedVersionConfirmed: PropTypes.func,
    loadFeedVersionForEditing: PropTypes.func,
    validationJob: PropTypes.object
  }
  render () {
    const {
      version,
      hasVersions,
      downloadFeedClicked,
      isPublic,
      loadFeedVersionForEditing,
      deleteDisabled,
      deleteFeedVersionConfirmed
    } = this.props
    const messages = getComponentMessages('FeedVersionViewer')
    return (
      <div style={{display: 'inline'}}>
        <ConfirmModal ref='confirm' />
        <ButtonToolbar className='pull-right'>

          {/* "Download Feed" Button */}
          <Button
            bsStyle='primary'
            disabled={!hasVersions}
            onClick={(evt) => downloadFeedClicked(version, isPublic)}
          >
            <Glyphicon glyph='download' /><span className='hidden-xs'> {getMessage(messages, 'download')}</span><span className='hidden-xs hidden-sm'> {getMessage(messages, 'feed')}</span>
          </Button>

          {/* "Load for Editing" Button */}
          {isModuleEnabled('editor') && !isPublic
            ? <Button bsStyle='success'
              disabled={!hasVersions}
              onClick={(evt) => {
                this.refs.confirm.open({
                  title: getMessage(messages, 'load'),
                  body: getMessage(messages, 'confirmLoad'),
                  onConfirm: () => { loadFeedVersionForEditing(version) }
                })
              }}
            >
              <Glyphicon glyph='pencil' /><span className='hidden-xs'> {getMessage(messages, 'load')}</span>
            </Button>
            : null
          }

          {/* "Delete Version" Button */}
          {!isPublic
            ? <Button
              bsStyle='danger'
              disabled={deleteDisabled || !hasVersions || typeof deleteFeedVersionConfirmed === 'undefined'}
              onClick={(evt) => {
                this.refs.confirm.open({
                  title: `${getMessage(messages, 'delete')} ${getMessage(messages, 'version')}`,
                  body: getMessage(messages, 'confirmDelete'),
                  onConfirm: () => { deleteFeedVersionConfirmed(version) }
                })
              }}
            >
              <Glyphicon glyph='trash' />
              <span className='hidden-xs'> {getMessage(messages, 'delete')}</span><span className='hidden-xs hidden-sm'> {getMessage(messages, 'version')}</span>
            </Button>
            : null
          }
        </ButtonToolbar>
      </div>
    )
  }
}

class VersionSectionSelector extends Component {
  static propTypes = {
    validationJob: PropTypes.object,
    version: PropTypes.object,
    feedVersionIndex: PropTypes.number,
    versionSection: PropTypes.string
  }
  renderIssuesLabel (version) {
    const color = this.props.validationJob
      ? 'warning'
      : version.validationSummary.loadStatus !== 'SUCCESS'
      ? 'danger'
      : version.validationSummary.errorCount
      ? 'warning'
      : 'success'
    const text = this.props.validationJob
      ? <span>processing <Icon className='fa-spin' type='refresh' /></span>
      : version.validationSummary.loadStatus !== 'SUCCESS'
      ? 'critical error'
      : version.validationSummary.errorCount
    return (
      <Label bsStyle={color}>
        {text}
      </Label>
    )
  }
  render () {
    const { version } = this.props
    return (
      <Panel>
        <ListGroup fill>
          <LinkContainer to={`/feed/${version.feedSource.id}/version/${this.props.feedVersionIndex}`} active={!this.props.versionSection}>
            <ListGroupItem><Icon type='info-circle' /> Version summary</ListGroupItem>
          </LinkContainer>
          <LinkContainer to={`/feed/${version.feedSource.id}/version/${this.props.feedVersionIndex}/issues`} active={this.props.versionSection === 'issues'}>
            <ListGroupItem>
              <Icon type='exclamation-triangle' /> Validation issues {this.renderIssuesLabel(version)}
            </ListGroupItem>
          </LinkContainer>
          {isModuleEnabled('gtfsplus')
            ? <LinkContainer to={`/feed/${version.feedSource.id}/version/${this.props.feedVersionIndex}/gtfsplus`} active={this.props.versionSection === 'gtfsplus'}>
              <ListGroupItem>
                <Icon type='plus' /> GTFS+ for this version
              </ListGroupItem>
            </LinkContainer>
            : null
          }
          <LinkContainer to={`/feed/${version.feedSource.id}/version/${this.props.feedVersionIndex}/comments`} active={this.props.versionSection === 'comments'}>
            <ListGroupItem><Glyphicon glyph='comment' /> Version comments <Label>{version.noteCount}</Label></ListGroupItem>
          </LinkContainer>
        </ListGroup>
      </Panel>
    )
  }
}

class VersionList extends Component {
  static propTypes = {
    versions: PropTypes.array
  }
  getVersionDateLabel (version) {
    const now = +moment()
    const future = version.validationSummary && version.validationSummary.startDate > now
    const expired = version.validationSummary && version.validationSummary.endDate < now
    return version.validationSummary
      ? <Label bsStyle={future ? 'info' : expired ? 'danger' : 'success'}>{future ? 'future' : expired ? 'expired' : 'active'}</Label>
      : null
  }
  render () {
    return <Panel header={<h3>List of feed versions</h3>}>
      <ListGroup fill>
        {this.props.versions
          ? this.props.versions.map(v => {
            return (
              <ListGroupItem>
                {v.name}
                {' '}
                <small>
                  {this.getVersionDateLabel(v)}
                </small>
                <VersionButtonToolbar
                  version={v}
                  {...this.props}
                />
              </ListGroupItem>
            )
          })
          : <ListGroupItem>
            No versions
          </ListGroupItem>
        }
      </ListGroup>
    </Panel>
  }
}
