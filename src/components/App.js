import React from 'react';
import PropTypes from 'prop-types';
import { connect } from 'unistore/react';
import { actions } from '../store';
import '../engine/live-events';
import logEvent from '../util/analytics';
/*
Theme/Style stuff
*/
import withStyles from '@material-ui/core/styles/withStyles';
import classNames from 'classnames';
import { lighten, darken } from '@material-ui/core/styles/colorManipulator';

/*
Material UI components
*/
import Shell from './Shell';
import AppLoader from './AppLoader';
import AppHeader from './AppHeader';

import Paper from '@material-ui/core/Paper';
import Drawer from '@material-ui/core/Drawer';

import MainSpeechControls from './MainSpeechControls';
import PlayControls from './PlayControls';
import AudioSelectDialog from './AudioSelectDialog';
import DataSelectDialog from './DataSelectDialog';
import AddTrackButton from './AddTrackButton';
import UpgradePrompt from './UpgradePrompt';

import SectionLoader from './SectionLoader';
import LoadFailure from './LoadFailure';
import asyncComponent from './asyncComponent';
const TrackList = asyncComponent(() => import('./TrackList'), {
	load: SectionLoader,
	fail: LoadFailure
});
const DataTableView = asyncComponent(() => import('./DataTableView'), {
	load: SectionLoader,
	fail: LoadFailure,
	defer: true
});

const Tour = asyncComponent(() => import('./Tour'));

/*
VUMeter todo:
- replace with more modular section
- load async, since spectrum viewer will be large
*/
import VUMeter from './VUMeter';

const drawerWidth = '40%'; // todo: responsive

const styles = (theme) => ({
	container: {
		flex: 1,
		display: 'flex',
		flexDirection: 'column',
		overflow: 'hidden'
	},
	main: {
		flex: 1,
		minHeight: 0,
		display: 'flex',
		overflow: 'hidden' // so we don't get weird drop shadows on sides
	},
	editor: {
		display: 'flex',
		flexDirection: 'column',
		width: '100%',
		marginRight: '-' + drawerWidth,
		overflow: 'hidden' // so we don't get weird drop shadows on sides
	},
	contentShift: {
		marginRight: 0/*,
		transition: theme.transitions.create('margin', {
			easing: theme.transitions.easing.easeOut,
			duration: theme.transitions.duration.enteringScreen
		})*/
	},
	generalControls: {
		padding: theme.spacing.unit,
		backgroundColor: theme.palette.type === 'dark' ?
			darken(theme.palette.background.paper, 0.05) :
			lighten(theme.palette.background.paper, 0.05)
	},
	tracks: {
		flex: 1,
		margin: theme.spacing.unit * 1,
		position: 'relative'
	},
	addTrackButton: {
		position: 'absolute',
		bottom: theme.spacing.unit * 1,
		right: theme.spacing.unit * 2
	},
	playBar: {
		width: '100%',
		display: 'flex',
		alignItems: 'center',
		backgroundColor: theme.palette.type !== 'dark' ?
			darken(theme.palette.background.paper, 0.05) :
			lighten(theme.palette.background.paper, 0.05)
	},
	playControls: {
		flex: 1
	},
	drawerDocked: {
		width: drawerWidth
	},
	drawerPaper: {
		position: 'relative'
	},
	drawerOpen: {
		'&$drawerDocked': {
			'@media (max-width: 650px)': {
				minWidth: drawerWidth,
				width: 300,
				maxWidth: '100%'
			}
		}
	},
	'@media (max-width: 650px)': {
		contentShift: {
			marginRight: '-' + drawerWidth
		}
	}
});

const Def = class App extends React.Component {
	static propTypes = {
		classes: PropTypes.object.isRequired,
		theme: PropTypes.object.isRequired,
		dataSource: PropTypes.object,
		dataSourceId: PropTypes.string,
		setDataSourceId: PropTypes.func.isRequired,
		createTrack: PropTypes.func.isRequired,
		blockPlayback: PropTypes.func.isRequired,
		releasePlayback: PropTypes.func.isRequired,
		setConfig: PropTypes.func.isRequired,
		loading: PropTypes.bool,
		upgradeReady: PropTypes.bool,
		config: PropTypes.object
	}

	playBlockClaim = Symbol()

	state = {
		activeDialog: '' // todo: need this from unistore so track components can use it
	}

	handleDataToggle = () => {
		this.props.setConfig({
			showData: !this.props.config.showData
		});
	}

	closeDialog = () => {
		this.props.releasePlayback(this.playBlockClaim);
		this.setState({
			activeDialog: ''
		});
	}

	selectDataSource = () => {
		/*
		todo: move this into dialog
		*/
		this.props.blockPlayback(this.playBlockClaim);
		this.setState({
			activeDialog: 'data'
		});
	}

	handleCreateTrack = type => {
		logEvent('track', 'create', type);
		this.props.createTrack(type);
	}

	componentWillUnmount() {
		this.props.releasePlayback(this.playBlockClaim);
	}

	render() {
		const {
			classes,
			dataSource,
			dataSourceId,
			upgradeReady,
			loading,
			config
		} = this.props;

		if (loading) {
			return <AppLoader/>;
		}

		const {
			showTour
		} = config;

		const showData = config.showData && !!dataSource;

		const { activeDialog } = this.state;

		const appHeader = <AppHeader
			onDataToggle={this.handleDataToggle}
			selectDataSource={this.selectDataSource}
		/>;

		return <Shell header={appHeader}>
			<div className={classes.container}>
				<main className={classes.main}>
					<div className={classNames(classes.editor, {
						[classes.contentShift]: showData
					})}>
						<div className={classes.tracks}>
							{dataSource && <TrackList/>}
							{/* todo: make this smaller*/}
							<AddTrackButton
								className={classes.addTrackButton}
								onClick={this.handleCreateTrack}
							/>
						</div>
						{dataSource && <MainSpeechControls
							className={classes.generalControls}
							selectDataSource={this.selectDataSource}
						/>}
						<VUMeter backgroundColor={this.props.theme.palette.background.paper}/>
					</div>
					<Drawer
						variant="persistent"
						anchor={'right'}
						open={showData}
						className={showData ? classes.drawerOpen : ''}
						classes={{
							docked: classes.drawerDocked,
							paper: classes.drawerPaper
						}}
					><DataTableView/></Drawer>
				</main>
				<Paper className={classes.playBar} square elevation={8}>
					<PlayControls
						classes={{
							root: classes.playControls
						}}
						disabled={!dataSource}
					/>
				</Paper>
			</div>
			{activeDialog === 'audio' && <AudioSelectDialog
				open={true}
				onClose={this.closeDialog}
				onSelect={id => this.handleUpdateTrack({
					audioId: id
				})}
				disableBackdropClick={false}
				waiting={false}
			/>}
			{(activeDialog === 'data' || !dataSource) && <DataSelectDialog
				open={true}
				cancelable={!!dataSource}
				onClose={this.closeDialog}
				defaultSelectedId={dataSourceId}
				disableBackdropClick={false}
				waiting={false}
			/>}
			{showTour && <Tour
				run={!loading && showTour && !!dataSource}
			/>}
			<UpgradePrompt upgradeReady={upgradeReady}/>
		</Shell>;
	}
};

const App = withStyles(styles, { withTheme: true })(
	connect(['dataSource', 'dataSourceId', 'loading', 'config'], actions)(Def)
);

export default App;