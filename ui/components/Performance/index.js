// @ts-nocheck
import React, { useState, useEffect } from 'react';
import {
  Button,
  Typography,
  MenuItem,
  IconButton,
  CircularProgress,
  FormControlLabel,
  Link,
  Grid2,
  CustomTooltip,
  ModalBody,
  ModalFooter,
  Box,
  AccordionDetails,
  TextField,
  NoSsr,
  FormLabel,
  Autocomplete,
  RadioGroup,
  AccordionSummary,
} from '@sistent/sistent';
import { URLValidator } from '../../utils/URLValidator';
import GetAppIcon from '@mui/icons-material/GetApp';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import HelpOutlineOutlinedIcon from '@mui/icons-material/HelpOutlineOutlined';
import SaveOutlinedIcon from '@mui/icons-material/SaveOutlined';
import MesheryChart from '../MesheryChart';
import LoadTestTimerDialog from '../load-test-timer-dialog';
import GrafanaCustomCharts from '../telemetry/grafana/GrafanaCustomCharts';
import { durationOptions } from '../../lib/prePopulatedOptions';
import fetchControlPlanes from '../graphql/queries/ControlPlanesQuery';
import { ctxUrl, getK8sClusterIdsFromCtxId } from '../../utils/multi-ctx';
import { iconMedium } from '../../css/icons.styles';
import { useNotification } from '../../utils/hooks/useNotification';
import { EVENT_TYPES } from '../../lib/event-types';
import { generateTestName, generateUUID } from './helper';
import CAN from '@/utils/can';
import { keys } from '@/utils/permission_constants';
import DefaultError from '@/components/General/error-404/index';
import { CustomTextTooltip } from '../MesheryMeshInterface/PatternService/CustomTextTooltip';
import { useGetUserPrefWithContextQuery } from '@/rtk-query/user';
import { useSavePerformanceProfileMutation } from '@/rtk-query/performance-profile';
import { useGetMeshQuery } from '@/rtk-query/mesh';
import { ArrowBack } from '@mui/icons-material';
import {
  CenterTimer,
  ExpansionPanelComponent,
  FormContainer,
  HelpIcon,
  RadioButton,
} from './style';
import { getMeshModels } from '@/api/meshmodel';
import { useDispatch, useSelector } from 'react-redux';
import { updateProgress } from '@/store/slices/mesheryUi';
import { updateLoadTest } from '@/store/slices/prefTest';
import { updateStaticPrometheusBoardConfig } from '@/store/slices/telemetry';
import { useGetStaticPrometheusBoardConfigQuery } from '@/rtk-query/telemetry';

// =============================== HELPER FUNCTIONS ===========================

/**
 * generatePerformanceProfile takes in data and generate a performance
 * profile object from it
 * @param {*} data
 */
export function generatePerformanceProfile(data) {
  const {
    id,
    name,
    loadGenerator,
    additional_options,
    endpoint,
    serviceMesh,
    concurrentRequest,
    qps,
    duration,
    requestHeaders,
    requestCookies,
    requestBody,
    contentType,
    caCertificate,
  } = data;

  const performanceProfileName = generateTestName(name, serviceMesh);

  return {
    ...(id && { id }),
    name: performanceProfileName,
    load_generators: [loadGenerator],
    endpoints: [endpoint],
    service_mesh: serviceMesh,
    concurrent_request: concurrentRequest,
    qps,
    duration,
    request_headers: requestHeaders,
    request_body: requestBody,
    request_cookies: requestCookies,
    content_type: contentType,
    metadata: {
      additional_options: [additional_options],
      ca_certificate: {
        file: caCertificate.file,
        name: caCertificate.name,
      },
    },
  };
}

// =============================== PERFORMANCE COMPONENT =======================
const loadGenerators = ['fortio', 'wrk2', 'nighthawk'];

const infoFlags = <>Only .json files are supported.</>;

const infoCRTCertificates = <>Only .crt files are supported.</>;

const infoloadGenerators = (
  <>
    Which load generators does Meshery support?
    <ul>
      <li>
        fortio - Fortio load testing library, command line tool, advanced echo server and web UI in
        go (golang). Allows to specify a set query-per-second load and record latency histograms and
        other useful stats.{' '}
      </li>
      <li> wrk2 - A constant throughput, correct latency recording variant of wrk.</li>
      <li>
        {' '}
        nighthawk - Enables users to run distributed performance tests to better mimic real-world,
        distributed systems scenarios.
      </li>
    </ul>
    <Link
      style={{ textDecoration: 'underline' }}
      color="inherit"
      href="https://docs.meshery.io/functionality/performance-management"
    >
      {' '}
      Performance Management
    </Link>
  </>
);

let eventStream = null;
const MesheryPerformanceComponent_ = (props) => {
  const {
    testName = '',
    meshName = '',
    url = '',
    qps = '0',
    c = '0',
    t = '30s',
    performanceProfileID,
    profileName,
    loadGenerator,
    additional_options,
    headers,
    cookies,
    reqBody,
    contentType,
    metadata,
    closeModal,
  } = props;
  const isJsonString = (str) => {
    try {
      JSON.parse(str);
    } catch {
      return false;
    }
    return true;
  };
  // Create individual state variables for each property
  const [testNameState, setTestName] = useState(testName);
  const [meshNameState, setMeshName] = useState(meshName);
  const [meshModels, setMeshModels] = useState([]);
  const [urlState, setUrl] = useState(url);
  const [qpsState, setQps] = useState(qps);
  const [cState, setC] = useState(c);
  const [tState, setT] = useState(t);
  const [tValueState, setTValue] = useState(t);
  const [loadGeneratorState, setLoadGenerator] = useState(loadGenerator || 'fortio');
  const [additionalOptionsState, setAdditionalOptions] = useState(additional_options || '');
  const [testResult, setTestResult] = useState();
  const [testResultsOpen, setTestResultsOpen] = useState(false);

  const [headersState, setHeaders] = useState(headers || '');
  const [cookiesState, setCookies] = useState(cookies || '');
  const [reqBodyState, setReqBody] = useState(reqBody || '');
  const [contentTypeState, setContentType] = useState(contentType || '');
  const [caCertificateState, setCaCertificate] = useState({});
  const [profileNameState, setProfileName] = useState(profileName || '');
  const [performanceProfileIDState, setPerformanceProfileID] = useState(performanceProfileID || '');
  const [timerDialogOpenState, setTimerDialogOpen] = useState(false);
  const [blockRunTestState, setBlockRunTest] = useState(false);
  const [urlErrorState, setUrlError] = useState(false);
  const [tErrorState, setTError] = useState('');
  const [jsonErrorState, setJsonError] = useState(false);
  const [disableTestState, setDisableTest] = useState(
    !(URLValidator(urlState) || isJsonString(additionalOptionsState)),
  );
  const [testUUIDState, setTestUUID] = useState(generateUUID());
  const [selectedMeshState, setSelectedMesh] = useState('');
  const [availableAdaptersState, setAvailableAdapters] = useState([]);
  const [availableSMPMeshesState, setAvailableSMPMeshes] = useState([]);
  const [metadataState, setMetadata] = useState(metadata);
  const [staticPrometheusBoardConfigState, setStaticPrometheusBoardConfig] = useState(
    staticPrometheusBoardConfig,
  );
  const { selectedK8sContexts } = useSelector((state) => state.ui);
  const { k8sConfig } = useSelector((state) => state.ui);
  const { staticPrometheusBoardConfig } = useSelector((state) => state.telemetry);
  const { notify } = useNotification();
  const dispatch = useDispatch();
  const { data: userData, isSuccess: isUserDataFetched } =
    useGetUserPrefWithContextQuery(selectedK8sContexts);

  const [savePerformanceProfile] = useSavePerformanceProfileMutation();
  const {
    data: smpMeshes,
    isSuccess: isSMPMeshesFetched,
    isError: isSMPMeshError,
  } = useGetMeshQuery();

  useEffect(() => {
    const fetchMeshModels = async () => {
      const { models } = await getMeshModels();
      const modelNames = models.map((model) => model.displayName);
      setMeshModels(modelNames);
    };
    fetchMeshModels();
  }, []);

  const handleChange = (name) => (event) => {
    const { value } = event.target;
    if (name === 'caCertificate') {
      if (!event.target.files?.length) return;

      const file = event.target.files[0];
      const reader = new FileReader();
      reader.addEventListener('load', (evt) => {
        setCaCertificate({
          name: file.name,
          file: evt.target.result,
        });
      });
      reader.readAsText(file);
    }

    if (name === 'url' && value !== '') {
      let urlPattern = value;

      let val = URLValidator(urlPattern);
      if (!val) {
        setDisableTest(true);
        setUrlError(true);
      } else {
        setDisableTest(false);
        setUrlError(false);
      }
    } else setUrlError(false);

    if (name === 'additional_options') {
      // Check if the target event is an input element (typing) or a file input (upload)
      const isFileUpload = event.target.getAttribute('type') === 'file';

      if (isFileUpload) {
        // Handle file upload
        const file = event.target.files[0];
        if (file) {
          const reader = new FileReader();
          reader.onload = (event) => {
            try {
              const fileContent = event.target.result;
              // Validate JSON
              JSON.parse(fileContent);
              setAdditionalOptions(fileContent);
              setJsonError(false);
            } catch {
              setAdditionalOptions(event.target.result);
              setJsonError(true);
            }
          };
          reader.readAsText(file);
        }
      } else {
        // Handle text input
        try {
          // empty text input exception
          if (value !== '') JSON.parse(value);
          setAdditionalOptions(value);
          setJsonError(false);
        } catch {
          setAdditionalOptions(value);
          setJsonError(true);
        }
      }
    }
    switch (name) {
      case 'profileName':
        setProfileName(value);
        break;
      case 'meshName':
        setMeshName(value);
        break;
      case 'c':
        setC(value);
        break;
      case 'qps':
        setQps(value);
        break;
      case 'headers':
        setHeaders(value);
        break;
      case 'cookies':
        setCookies(value);
        break;
      case 'contentType':
        setContentType(value);
        break;
      case 'reqBody':
        setReqBody(value);
        break;
      case 'loadGenerator':
        setLoadGenerator(value);
        break;
      case 'url':
        setUrl(value);
        break;
      default:
        // Handle any other cases or do nothing if not matched
        break;
    }
  };

  const handleDurationChange = (event, newValue) => {
    setTValue(newValue);
    if (newValue !== null) {
      setTError('');
    }
  };

  const handleInputDurationChange = (event, newValue) => {
    setT(newValue);
  };

  const handleSubmit = () => {
    if (urlState === '') {
      setUrlError(true);
      return;
    }

    let err = false;
    let tNum = 0;
    try {
      tNum = parseInt(t.substring(0, tState.length - 1));
    } catch {
      err = true;
    }

    if (
      tState === '' ||
      tState === null ||
      !(
        tState.toLowerCase().endsWith('h') ||
        tState.toLowerCase().endsWith('m') ||
        tState.toLowerCase().endsWith('s')
      ) ||
      err ||
      tNum <= 0
    ) {
      setTError('error-autocomplete-value');
      closeModal && closeModal();
      return;
    }

    if (!performanceProfileIDState) {
      submitProfile(({ id }) => submitLoadTest(id));
      closeModal && closeModal();
      return;
    }
    submitLoadTest(performanceProfileIDState);
    closeModal && closeModal();
  };

  const submitProfile = (cb) => {
    const profile = generatePerformanceProfile({
      name: profileNameState,
      loadGenerator: loadGeneratorState,
      additional_options: additionalOptionsState,
      endpoint: urlState,
      serviceMesh: meshNameState,
      concurrentRequest: +cState || 0,
      qps: +qpsState || 0,
      duration: tState,
      requestHeaders: headersState,
      requestCookies: cookiesState,
      requestBody: reqBodyState,
      contentType: contentTypeState,
      caCertificate: caCertificateState,
      testName: testNameState,
      id: performanceProfileIDState,
    });

    handleProfileUpload(profile, true, cb);
  };

  const handleAbort = () => {
    setProfileName('');
    setLoadGenerator('');
    setAdditionalOptions('');
    setUrl('');
    setMeshName('');
    setC(0);
    setQps(0);
    setT('30s');
    setHeaders('');
    setCookies('');
    setReqBody('');
    setContentType('');
    setTestName('');
    setPerformanceProfileID('');
    setDisableTest(true);
    return;
  };

  const handleProfileUpload = (body, generateNotif, cb) => {
    if (generateNotif) updateProgress({ showProgress: true });
    savePerformanceProfile({ body: body })
      .unwrap()
      .then((result) => {
        if (result) {
          updateProgress({ showProgress: false });
          setPerformanceProfileID(result.id);
          if (cb) cb(result);
          if (generateNotif) {
            notify({
              message: `Performance profile ${result.name} has been created`,
              event_type: EVENT_TYPES.SUCCESS,
            });
          }
        }
      })
      .catch((err) => {
        console.error(err);
        updateProgress({ showProgress: false });
        notify({
          message: 'Failed to create performance profile',
          event_type: EVENT_TYPES.ERROR,
          details: err.toString(),
        });
      });
  };

  const submitLoadTest = (id) => {
    const computedTestName = generateTestName(testNameState, meshNameState);
    setTestName(computedTestName);

    const t1 = tState.substring(0, tState.length - 1);
    const dur = tState.substring(tState.length - 1, tState.length).toLowerCase();

    const data = {
      name: computedTestName,
      mesh: meshName === '' || meshName === 'None' ? '' : meshNameState, // to prevent None from getting to the DB
      url: urlState,
      qps: qpsState,
      c: cState,
      t: t1,
      dur,
      uuid: testUUIDState,
      loadGenerator: loadGeneratorState,
      additional_options: additionalOptionsState,
      headers: headersState,
      cookies: cookiesState,
      reqBody: reqBodyState,
      contentType: contentTypeState,
    };
    const params = Object.keys(data)
      .map((key) => `${encodeURIComponent(key)}=${encodeURIComponent(data[key])}`)
      .join('&');

    const runURL =
      ctxUrl(`/api/user/performance/profiles/${id}/run`, selectedK8sContexts) + '&cert=true';
    startEventStream(`${runURL}${selectedK8sContexts?.length > 0 ? '&' : '?'}${params}`);
    setBlockRunTest(true); // to block the button
  };

  function handleSuccess() {
    return (result) => {
      if (typeof result !== 'undefined' && typeof result.runner_results !== 'undefined') {
        notify({
          message: 'fetched the data.',
          event_type: EVENT_TYPES.SUCCESS,
          dataTestID: 'notify-fetch-data',
        });
        dispatch(
          updateLoadTest({
            loadTest: {
              testName: testNameState,
              meshName: meshNameState,
              url: urlState,
              qps: qpsState,
              c: cState,
              t: tState,
              loadGenerator: loadGeneratorState,
              result: result,
            },
          }),
        );
        setTestUUID(generateUUID());

        setTestResultsOpen(true);
        setTestResult(result);
      }
      closeEventStream();
      setBlockRunTest(false);
      setTimerDialogOpen(false);
    };
  }
  async function startEventStream(url) {
    closeEventStream();
    eventStream = new EventSource(url);
    eventStream.onmessage = handleEvents();
    eventStream.onerror = handleError(
      'Connection to the server got disconnected. Load test might be running in the background. Please check the results page in a few.',
    );
    notify({
      message: 'Load test has been submitted',
      event_type: EVENT_TYPES.SUCCESS,
    });
  }

  function handleEvents() {
    let track = 0;
    return (e) => {
      const data = JSON.parse(e.data);

      switch (data.status) {
        case 'info':
          notify({ message: data.message, event_type: EVENT_TYPES.INFO });
          if (track === 0) {
            setTimerDialogOpen(true);
            // setResult({});
            track++;
          }
          break;
        case 'error':
          handleError('Load test did not run with msg')(data.message);
          break;
        case 'success':
          handleSuccess()(data.result);
          break;
      }
    };
  }

  function closeEventStream() {
    if (eventStream && eventStream.close) {
      eventStream.close();
      eventStream = null;
    }
  }
  useEffect(() => {
    scanForMeshes();
    getLoadTestPrefs();
    getSMPMeshes();
    if (props.runTestOnMount) handleSubmit();
  }, [userData, isUserDataFetched, smpMeshes]);

  const getLoadTestPrefs = () => {
    if (isUserDataFetched && userData && userData.loadTestPref) {
      setQps(userData.loadTestPrefs.qps);
      setC(userData.loadTestPrefs.c);
      setT(userData.loadTestPrefs.t);
      setLoadGenerator(userData.loadTestPrefs.gen);
    }
  };

  const shouldSkipFetch =
    (staticPrometheusBoardConfig &&
      staticPrometheusBoardConfig !== null &&
      Object.keys(staticPrometheusBoardConfig).length > 0) ||
    (staticPrometheusBoardConfigState &&
      staticPrometheusBoardConfigState !== null &&
      Object.keys(staticPrometheusBoardConfigState).length > 0);

  const {
    data: configData,
    isSuccess: isConfigFetchSuccessful,
    isError: isConfigFetchFailed,
    error: fetchError,
  } = useGetStaticPrometheusBoardConfigQuery(undefined, {
    skip: shouldSkipFetch,
  });

  const persistStaticBoardConfig = () => {
    if (
      isConfigFetchSuccessful &&
      configData &&
      typeof configData !== 'undefined' &&
      typeof configData.cluster !== 'undefined' &&
      typeof configData.node !== 'undefined' &&
      typeof configData.cluster.panels !== 'undefined' &&
      configData.cluster.panels.length > 0 &&
      typeof configData.node.panels !== 'undefined' &&
      configData.node.panels.length > 0
    ) {
      dispatch(
        updateStaticPrometheusBoardConfig({
          staticPrometheusBoardConfig: configData,
        }),
      );
      setStaticPrometheusBoardConfig(configData);
    }
  };

  const logBoardConfigFetchError = () => {
    handleWarn(
      'Unable to fetch pre-configured boards: No Kubernetes cluster is connected, so statistics will not be gathered from cluster',
    )(fetchError);
  };

  useEffect(() => {
    if (isConfigFetchSuccessful) persistStaticBoardConfig();
    else if (isConfigFetchFailed) logBoardConfigFetchError();
  }, [isConfigFetchSuccessful, isConfigFetchFailed]);

  const getK8sClusterIds = () => {
    return getK8sClusterIdsFromCtxId(selectedK8sContexts, k8sConfig);
  };

  const scanForMeshes = () => {
    if (typeof k8sConfig === 'undefined' || !k8sConfig.clusterConfigured) {
      return;
    }
    /**
     * ALL_MESH indicates that we are interested in control plane
     * component of all of the service meshes supported by meshsync v2
     */

    const ALL_MESH = {
      type: 'ALL_MESH',
      k8sClusterIDs: getK8sClusterIds(),
    };

    fetchControlPlanes(ALL_MESH).subscribe({
      next: (res) => {
        let result = res?.controlPlanesState;
        if (typeof result !== 'undefined' && Object.keys(result).length > 0) {
          const adaptersList = [];
          result.forEach((mesh) => {
            if (mesh?.members.length > 0) {
              let name = mesh?.name;
              adaptersList.push(
                // Capatilize First Letter and replace undersocres
                name
                  .split(/ |_/i)
                  .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
                  .join(' '),
              );
            }
          });
          setAvailableAdapters(adaptersList);
          result.forEach((mesh) => {
            setSelectedMesh(mesh?.name);
          });
        }
      },
      error: (err) => console.error(err),
    });
  };

  const getSMPMeshes = () => {
    if (isSMPMeshesFetched && smpMeshes) {
      setAvailableSMPMeshes([...smpMeshes.available_meshes].sort((m1, m2) => m1.localeCompare(m2))); // shallow copy of the array to sort it
    } else if (isSMPMeshError) {
      handleError('unable to fetch SMP meshes');
    }
  };

  function handleError(msg) {
    return (error) => {
      setBlockRunTest(false);
      setTimerDialogOpen(false);
      closeEventStream();
      let finalMsg = msg;
      if (typeof error === 'string') {
        finalMsg = `${msg}: ${error}`;
      }
      notify({
        message: finalMsg,
        event_type: EVENT_TYPES.ERROR,
        details: error.toString(),
      });
    };
  }

  function handleWarn(msg) {
    return (error) => {
      // setBlockRunTest(false);
      // setTimerDialogOpen(false);
      // closeEventStream();
      let finalMsg = msg;
      if (typeof error === 'string') {
        finalMsg = `${msg}`;
      }

      notify({
        message: finalMsg,
        event_type: EVENT_TYPES.WARNING,
        details: error.toString(),
      });
    };
  }

  const handleCertificateUpload = (event) => {
    const file = event.target.files[0];
    if (file) {
      const newMetadata = {
        ...metadataState,
        ca_certificate: {
          ...metadataState.ca_certificate,
          name: file.name,
        },
      };
      setMetadata(newMetadata);
    }
  };

  const handleTimerDialogClose = () => {
    setTimerDialogOpen(false);
  };
  const { grafana } = useSelector((state) => state.telemetry);
  const { prometheus } = useSelector((state) => state.telemetry);
  let localStaticPrometheusBoardConfig;
  if (
    staticPrometheusBoardConfig &&
    staticPrometheusBoardConfig != null &&
    Object.keys(staticPrometheusBoardConfig).length > 0
  ) {
    localStaticPrometheusBoardConfig = staticPrometheusBoardConfig;
  } else {
    localStaticPrometheusBoardConfig = staticPrometheusBoardConfigState;
  }
  let chartStyle = {};
  if (timerDialogOpenState) {
    chartStyle = { opacity: 0.3 };
  }
  let displayStaticCharts = null;
  let displayGCharts = null;
  let displayPromCharts = null;

  availableAdaptersState.forEach((item) => {
    const index = availableSMPMeshesState.indexOf(item);
    if (index !== -1) availableSMPMeshesState.splice(index, 1);
  });

  if (
    localStaticPrometheusBoardConfig &&
    localStaticPrometheusBoardConfig !== null &&
    Object.keys(localStaticPrometheusBoardConfig).length > 0 &&
    prometheus.prometheusURL !== ''
  ) {
    // only add testUUID to the board that should be persisted
    if (localStaticPrometheusBoardConfig.cluster) {
      localStaticPrometheusBoardConfig.cluster.testUUID = testUUIDState;
    }
    displayStaticCharts = (
      <React.Fragment>
        <Typography variant="h6" gutterBottom sx={{ textAlign: 'center' }}>
          Node Metrics
        </Typography>
        <GrafanaCustomCharts
          boardPanelConfigs={[
            localStaticPrometheusBoardConfig.cluster,
            localStaticPrometheusBoardConfig.node,
          ]}
          prometheusURL={prometheus.prometheusURL}
        />
      </React.Fragment>
    );
  }
  if (prometheus.selectedPrometheusBoardsConfigs.length > 0) {
    displayPromCharts = (
      <React.Fragment>
        <Typography variant="h6" gutterBottom sx={{ textAlign: 'center' }}>
          Prometheus charts
        </Typography>
        <GrafanaCustomCharts
          boardPanelConfigs={prometheus.selectedPrometheusBoardsConfigs}
          prometheusURL={prometheus.prometheusURL}
        />
      </React.Fragment>
    );
  }
  if (grafana.selectedBoardsConfigs.length > 0) {
    displayGCharts = (
      <React.Fragment>
        <Typography variant="h6" gutterBottom sx={{ textAlign: 'center' }}>
          Grafana charts
        </Typography>
        <GrafanaCustomCharts
          boardPanelConfigs={grafana.selectedBoardsConfigs}
          grafanaURL={grafana.grafanaURL}
          grafanaAPIKey={grafana.grafanaAPIKey}
        />
      </React.Fragment>
    );
  }

  const Results = () => {
    if (!testResult || !testResult.runner_results) {
      return null;
    }

    return (
      <div>
        <Box display="flex" justifyContent="space-between" alignItems="center">
          <IconButton onClick={() => setTestResultsOpen(false)}>
            <ArrowBack />
          </IconButton>
          <Typography variant="h6" gutterBottom sx={{ textAlign: 'center' }} id="timerAnchor">
            Test Results
          </Typography>
          <IconButton
            key="download"
            aria-label="download"
            color="inherit"
            // onClick={() => self.props.closeSnackbar(key) }
            href={`/api/perf/profile/result/${encodeURIComponent(testResult.meshery_id)}`}
          >
            <GetAppIcon style={iconMedium} />
          </IconButton>
        </Box>
        <div style={chartStyle}>
          <MesheryChart
            rawdata={[testResult && testResult.runner_results ? testResult : {}]}
            data={[testResult && testResult.runner_results ? testResult.runner_results : {}]}
          />
        </div>
      </div>
    );
  };

  if (testResultsOpen) {
    return <Results />;
  }

  return (
    <NoSsr>
      {CAN(keys.VIEW_PERFORMANCE_PROFILES.action, keys.VIEW_PERFORMANCE_PROFILES.subject) ? (
        <>
          <React.Fragment>
            {/* <div className={classes.wrapperClss} style={props.style || {}}> */}
            <ModalBody>
              <Grid2 container spacing={1} size="grow">
                <Grid2 size={{ xs: 12, md: 6 }}>
                  <TextField
                    id="profileName"
                    name="profileName"
                    label="Profile Name"
                    fullWidth
                    value={profileNameState}
                    margin="normal"
                    variant="outlined"
                    onChange={handleChange('profileName')}
                    inputProps={{
                      maxLength: 300,
                    }}
                    InputProps={{
                      endAdornment: (
                        <CustomTooltip title="Create a profile providing a name, if a profile name is not provided, a random one will be generated for you.">
                          <HelpOutlineOutlinedIcon style={{ color: '#929292' }} />
                        </CustomTooltip>
                      ),
                    }}
                  />
                </Grid2>

                <Grid2 size={{ xs: 12, md: 6 }}>
                  <TextField
                    select
                    id="meshName"
                    name="meshName"
                    label="Technology"
                    fullWidth
                    value={
                      meshNameState === '' && selectedMeshState !== ''
                        ? selectedMeshState
                        : meshNameState
                    }
                    margin="normal"
                    variant="outlined"
                    onChange={handleChange('meshName')}
                  >
                    <MenuItem key="mh_-_none" value="None">
                      None
                    </MenuItem>
                    {meshModels &&
                      meshModels.map((mesh) => (
                        <MenuItem key={`mh_-_${mesh}`} value={mesh.toLowerCase()}>
                          {mesh}
                        </MenuItem>
                      ))}
                  </TextField>
                </Grid2>
                <Grid2 size={{ xs: 12 }}>
                  <TextField
                    required
                    id="url"
                    name="url"
                    label="URL to test"
                    type="url"
                    fullWidth
                    value={urlState}
                    error={urlErrorState}
                    helperText={urlErrorState ? 'Please enter a valid URL along with protocol' : ''}
                    margin="normal"
                    variant="outlined"
                    onChange={handleChange('url')}
                    InputProps={{
                      endAdornment: (
                        <CustomTooltip title="The Endpoint where the load will be generated and the performance test will run against.">
                          <HelpOutlineOutlinedIcon style={{ color: '#929292' }} />
                        </CustomTooltip>
                      ),
                    }}
                  />
                </Grid2>
                <Grid2 size={{ xs: 12, md: 4 }}>
                  <TextField
                    required
                    id="c"
                    name="c"
                    label="Concurrent requests"
                    type="number"
                    fullWidth
                    value={cState}
                    inputProps={{ min: '0', step: '1' }}
                    margin="normal"
                    variant="outlined"
                    onChange={handleChange('c')}
                    InputLabelProps={{ shrink: true }}
                    InputProps={{
                      endAdornment: (
                        <CustomTooltip title="Load Testing tool will create this many concurrent request against the endpoint.">
                          <HelpOutlineOutlinedIcon style={{ color: '#929292' }} />
                        </CustomTooltip>
                      ),
                    }}
                  />
                </Grid2>
                <Grid2 size={{ xs: 12, md: 4 }}>
                  <TextField
                    required
                    id="qps"
                    name="qps"
                    label="Queries per second"
                    type="number"
                    fullWidth
                    value={qpsState}
                    inputProps={{ min: '0', step: '1' }}
                    margin="normal"
                    variant="outlined"
                    onChange={handleChange('qps')}
                    InputLabelProps={{ shrink: true }}
                    InputProps={{
                      endAdornment: (
                        <CustomTooltip title="The Number of queries/second. If not provided then the MAX number of queries/second will be requested">
                          <HelpOutlineOutlinedIcon style={{ color: '#929292' }} />
                        </CustomTooltip>
                      ),
                    }}
                  />
                </Grid2>
                <Grid2 size={{ xs: 12, md: 4 }}>
                  <CustomTooltip
                    title={
                      "Please use 'h', 'm' or 's' suffix for hour, minute or second respectively."
                    }
                  >
                    <Autocomplete
                      required
                      id="t"
                      name="t"
                      freeSolo
                      label="Duration*"
                      fullWidth
                      variant="outlined"
                      // className={classes.errorValue}
                      classes={{ root: tErrorState }}
                      value={tValueState}
                      inputValue={tState}
                      onChange={handleDurationChange}
                      onInputChange={handleInputDurationChange}
                      options={durationOptions}
                      style={{ marginTop: '16px', marginBottom: '8px' }}
                      renderInput={(params) => (
                        <TextField {...params} label="Duration*" variant="outlined" />
                      )}
                      InputProps={{
                        endAdornment: (
                          <CustomTooltip title="Default duration is 30 seconds">
                            <HelpOutlineOutlinedIcon style={{ color: '#929292' }} />
                          </CustomTooltip>
                        ),
                      }}
                    />
                  </CustomTooltip>
                </Grid2>
                <Grid2 size={{ xs: 12, md: 12 }}>
                  <ExpansionPanelComponent>
                    <AccordionSummary expanded={true} expandIcon={<ExpandMoreIcon />}>
                      <Typography align="center" color="textSecondary" variant="h6">
                        Advanced Options
                      </Typography>
                    </AccordionSummary>
                    <AccordionDetails>
                      <Grid2 container spacing={1} size="grow">
                        <Grid2 size={{ xs: 12 }}>
                          <TextField
                            id="headers"
                            name="headers"
                            label='Request Headers e.g. {"host":"bookinfo.meshery.io"}'
                            fullWidth
                            value={headersState}
                            multiline
                            margin="normal"
                            variant="outlined"
                            onChange={handleChange('headers')}
                          ></TextField>
                        </Grid2>
                        <Grid2 size={{ xs: 12 }}>
                          <TextField
                            id="cookies"
                            name="cookies"
                            label='Request Cookies e.g. {"yummy_cookie":"choco_chip"}'
                            fullWidth
                            value={cookiesState}
                            multiline
                            margin="normal"
                            variant="outlined"
                            onChange={handleChange('cookies')}
                          ></TextField>
                        </Grid2>
                        <Grid2 size={{ xs: 12 }}>
                          <TextField
                            id="contentType"
                            name="contentType"
                            label="Content Type e.g. application/json"
                            fullWidth
                            value={contentTypeState}
                            multiline
                            margin="normal"
                            variant="outlined"
                            onChange={handleChange('contentType')}
                          ></TextField>
                        </Grid2>
                        <Grid2 size={{ xs: 12 }}>
                          <TextField
                            id="cookies"
                            name="cookies"
                            label='Request Body e.g. {"method":"post","url":"http://bookinfo.meshery.io/test"}'
                            fullWidth
                            value={reqBodyState}
                            multiline
                            margin="normal"
                            variant="outlined"
                            onChange={handleChange('reqBody')}
                          ></TextField>
                        </Grid2>
                        <Grid2 container size="grow">
                          <Grid2 size={{ xs: 6 }}>
                            <TextField
                              id="additional_options"
                              name="additional_options"
                              label="Additional Options e.g. { `requestPerSecond`: 20 }"
                              fullWidth
                              error={jsonErrorState}
                              helperText={jsonErrorState ? 'Please enter a valid JSON string' : ''}
                              value={
                                additionalOptionsState.length > 150
                                  ? `${additionalOptionsState.slice(0, 150)} .....`
                                  : additionalOptionsState
                              }
                              multiline
                              margin="normal"
                              variant="outlined"
                              size="small"
                              onChange={handleChange('additional_options')}
                            />
                          </Grid2>
                          <Grid2 size={{ xs: 6 }}>
                            <label
                              htmlFor="upload-additional-options"
                              style={{ paddingLeft: '0.7rem', paddingTop: '8px' }}
                              fullWidth
                            >
                              <Button
                                variant="outlined"
                                onChange={handleChange('additional_options')}
                                aria-label="Upload Button"
                                component="span"
                                style={{ margin: '0.5rem', marginTop: '1.15rem' }}
                              >
                                <input
                                  id="upload-additional-options"
                                  type="file"
                                  accept={'.json'}
                                  name="upload-button"
                                  hidden
                                  data-cy="additional-options-upload-button"
                                />
                                Browse
                              </Button>
                              <CustomTooltip title={infoFlags} interactive>
                                <HelpIcon />
                              </CustomTooltip>
                            </label>
                          </Grid2>
                        </Grid2>
                        <Grid2 container size="grow">
                          <Grid2 size={{ xs: 6 }}>
                            <TextField
                              size="small"
                              variant="outlined"
                              margin="mormal"
                              fullWidth
                              label={
                                caCertificateState?.name || 'Upload SSL Certificate e.g. .crt file'
                              }
                              style={{ width: '100%', margin: '0.5rem 0' }}
                              value={metadataState?.ca_certificate.name}
                            />
                          </Grid2>
                          <Grid2 size={{ xs: 6 }}>
                            <label
                              htmlFor="upload-cacertificate"
                              style={{ paddingLeft: '0.7rem', paddingTop: '8px' }}
                            >
                              <Button
                                variant="outlined"
                                aria-label="Upload Button"
                                onChange={handleChange('caCertificate')}
                                component="span"
                                style={{ margin: '0.5rem' }}
                              >
                                <input
                                  id="upload-cacertificate"
                                  type="file"
                                  accept={'.crt'}
                                  name="upload-button"
                                  hidden
                                  data-cy="cacertificate-upload-button"
                                  onChange={handleCertificateUpload}
                                />
                                Browse
                              </Button>
                              <CustomTooltip title={infoCRTCertificates} interactive>
                                <HelpIcon />
                              </CustomTooltip>
                            </label>
                          </Grid2>
                        </Grid2>
                      </Grid2>
                    </AccordionDetails>
                  </ExpansionPanelComponent>
                </Grid2>
                <Grid2 size={{ xs: 12, md: 4 }}>
                  <FormContainer component="loadGenerator">
                    <FormLabel
                      component="loadGenerator"
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        flexWrap: 'wrap',
                      }}
                    >
                      Load generator
                      <CustomTextTooltip title={infoloadGenerators} interactive>
                        <HelpIcon />
                      </CustomTextTooltip>
                    </FormLabel>
                    <RadioGroup
                      aria-label="loadGenerator"
                      name="loadGenerator"
                      value={loadGeneratorState}
                      onChange={handleChange('loadGenerator')}
                      row
                    >
                      {loadGenerators.map((lg, index) => (
                        <FormControlLabel
                          key={index}
                          value={lg}
                          disabled={lg === 'wrk2'}
                          control={<RadioButton color="primary" />}
                          label={lg}
                        />
                      ))}
                    </RadioGroup>
                  </FormContainer>
                </Grid2>
              </Grid2>
            </ModalBody>
            <ModalFooter variant="filled">
              <React.Fragment>
                <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                  <Button
                    type="submit"
                    variant="contained"
                    color="primary"
                    size="large"
                    sx={{ marginLeft: '1rem' }}
                    disabled={disableTestState}
                    onClick={() => handleAbort()}
                  >
                    Clear
                  </Button>
                  {testResult && (
                    <Button
                      type="submit"
                      variant="contained"
                      color="primary"
                      size="large"
                      csx={{ marginLeft: '1rem' }}
                      disabled={disableTestState}
                      onClick={() => setTestResultsOpen(true)}
                    >
                      Results
                    </Button>
                  )}
                  <Button
                    type="submit"
                    variant="contained"
                    color="primary"
                    size="large"
                    onClick={() => submitProfile()}
                    sx={{ marginLeft: '1rem' }}
                    disabled={disableTestState}
                    startIcon={<SaveOutlinedIcon />}
                  >
                    Save Profile
                  </Button>
                  <Button
                    type="submit"
                    data-testid="run-performance-test"
                    variant="contained"
                    color="primary"
                    size="large"
                    onClick={handleSubmit}
                    sx={{ marginLeft: '1rem' }}
                    disabled={
                      blockRunTestState ||
                      disableTestState ||
                      !CAN(keys.RUN_TEST.action, keys.RUN_TEST.subject)
                    }
                  >
                    {blockRunTestState ? <CircularProgress size={30} /> : 'Run Test'}
                  </Button>
                </div>
              </React.Fragment>
            </ModalFooter>

            {timerDialogOpenState ? (
              <CenterTimer>
                <LoadTestTimerDialog
                  open={timerDialogOpenState}
                  t={tState}
                  onClose={handleTimerDialogClose}
                  countDownComplete={handleTimerDialogClose}
                />
              </CenterTimer>
            ) : null}
          </React.Fragment>

          {displayStaticCharts}

          {displayPromCharts}

          {displayGCharts}
        </>
      ) : (
        <DefaultError />
      )}
    </NoSsr>
  );
};

export const MesheryPerformanceComponentWithStyles = MesheryPerformanceComponent_;

export const MesheryPerformanceComponent = (props) => {
  return <MesheryPerformanceComponentWithStyles {...props} />;
};

export default MesheryPerformanceComponent;
