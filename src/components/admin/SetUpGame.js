import React, { Component } from 'react'
import SideMenu from '../admin/SideMenu';
import { Modal } from 'reactstrap';
import TopMenu from '../admin/TopBar';
//import {database} from '../../base';
import {
  ref,
  onValue,
  off,
  set,
  get,
  push,
  query,
  orderByChild,
  equalTo, limitToFirst, update
} from "firebase/database";

import "react-responsive-carousel/lib/styles/carousel.min.css";
import { Carousel } from 'react-responsive-carousel';
import '../../styles/css/AdminMain.css';
import { Accordion, AccordionItem } from 'react-sanfona';
import DatePicker from '../utils/DatePicker';
import {
  convertTimeStampToHumanReadable,
  ErrorMessage,
  findFirstAndLastName,
  Toast,
  WarningMessage,
  detectHowManyCodesEntered, validateEmail
} from '../utils/HelpfulFunction';
import Papa from 'papaparse';

class SetUpGame extends Component {
  constructor(props) {
    super(props);
    this.state = {
      ticketList: [],
      tenantVariables: {},
      questionsList: [],
      questionsAdded: [],
      emailsSent: {},
      question: 0,
      userAnswers: [],
      currentGame: null,
      modal: false,
      userGameHistory: [],
      users: [],
      gameName: "",
      startTime: new Date(),
      endTime: new Date(),
      loading: true,
      wizardLocation: 'first',
      showStats: false,
      tierMessaging: [],
      itemsPerPage: 0,
      itemsToShow: 0,
      predictionsAnsweredModal: false
    };

    this.handleChange = this.handleChange.bind(this);
    this.toggle = this.toggle.bind(this);
    this.togglePredictionsAnsweredModal = this.togglePredictionsAnsweredModal.bind(this);
  }

  componentDidMount() {
    // tenantVariables
    this.tenantVariablesRef = ref(database, 'tenantVariables');
    this.tenantVariablesListener = onValue(this.tenantVariablesRef, (snapshot) => {
      this.setState({ tenantVariables: snapshot.val() || {} });
    });

    // rewardsList (as array)
    this.rewardsListRef = ref(database, 'rewardsList');
    this.rewardsListListener = onValue(this.rewardsListRef, (snapshot) => {
      const data = snapshot.val() || {};
      // Convert object to array (similar to rebase asArray)
      const ticketList = Object.keys(data).map((key) => ({
        ...data[key],
        key,
      }));
      this.setState({ ticketList });
    });

    // questionsList (as array)
    this.questionsListRef = ref(database, 'questionsList');
    this.questionsListListener = onValue(this.questionsListRef, (snapshot) => {
      const data = snapshot.val() || {};
      const questionsList = Object.keys(data).map((key) => ({
        ...data[key],
        key,
      }));
      this.setState({ questionsList });
    });

    // emailsSent
    this.emailsSentRef = ref(database, 'emailsSent');
    this.emailsSentListener = onValue(this.emailsSentRef, (snapshot) => {
      this.setState({ emailsSent: snapshot.val() });
    });

    // userAnswers
    this.userAnswersRef = ref(database, 'userAnswers');
    this.userAnswersListener = onValue(this.userAnswersRef, (snapshot) => {
      // For numChildren, you can do snapshot.size if needed.
      this.setState({ userAnswerCount: snapshot.size || 0 });
    });

    // currentGame
    this.currentGameRef = ref(database, 'currentGame');
    this.currentGameListener = onValue(this.currentGameRef, (snapshot) => {
      const data = snapshot.val() || {};
      // after setting state, run setGameToWatch if there's an ID
      this.setState({ currentGame: data }, () => {
        if (data.id) {
          this.setGameToWatch(data.id);
        }
      });
    });

    this.setState({ loading: false });
  }

  componentWillUnmount() {
    // Unsubscribe from all onValue listeners:

    if (this.userGameHistoryRef && this.userGameHistoryListener) {
      off(this.userGameHistoryRef, 'value', this.userGameHistoryListener);
    }

    off(this.tenantVariablesRef, 'value', this.tenantVariablesListener);
    off(this.rewardsListRef, 'value', this.rewardsListListener);
    off(this.questionsListRef, 'value', this.questionsListListener);
    off(this.currentGameRef, 'value', this.currentGameListener);
    off(this.userAnswersRef, 'value', this.userAnswersListener);
    off(this.emailsSentRef, 'value', this.emailsSentListener);
  }

  setGameToWatch(id) {
    // If we had a previous userGameHistoryRef, turn it off
    if (this.userGameHistoryRef && this.userGameHistoryListener) {
      off(this.userGameHistoryRef, 'value', this.userGameHistoryListener);
    }
    if (id) {
      // Create a query: orderByChild(id).equalTo(id)
      this.userGameHistoryRef = query(ref(database, 'userGameHistory'), orderByChild(id), equalTo(id));
      this.userGameHistoryListener = onValue(this.userGameHistoryRef, (snapshot) => {
        // snapshot.size is the # of children
        this.setState({ userGameHistory: snapshot.size || 0 });
      });
    }
  }

  async createGame() {
    const createGameObject = {};
    const tenantVariables = this.state.tenantVariables;

    // Generate a new push key
    const gameId = push(ref(database)).key;
    const questionsAdded = this.state.questionsAdded;
    let gameName = this.state.gameName.trim();
    let startTime = this.state.startTime;
    let endTime = this.state.endTime;
    let showScheduleTime = this.state.showScheduleTime;
    let editAnswers = this.state.editAnswers;

    if (!gameName) {
      ErrorMessage.fire({
        title: 'Hold On!',
        text: 'The game needs a name!',
      });
      return;
    }

    if (questionsAdded.length === 0) {
      ErrorMessage.fire({
        title: 'Missing Prediction',
        text: 'Go to the second tab to add predictions',
      });
      return;
    }

    // Build up the tier messaging array & rewardList
    const rewardList = [];
    const messaging_array = [];
    for (let i = 0; i < questionsAdded.length + 1; i++) {
      // i corresponds to # correct answers
      let tiermessaging = {};

      // Some defaults
      let winningHeader = 'You win!';
      let winningMessage = 'Check your email for your prize!';
      let winningMissedHeader = 'Nice Job!';
      let winningMissedMessage = `You got ${i} correct! Unfortunately you didn't win a prize but try again soon!`;
      let losingHeader = 'Oh No!';
      let losingMessage = 'Nice try but no prize this time!  Try again soon!';

      if (i > 0) {
        winningMessage = `You got ${i} correct! Check your email for your prize!`;
      }
      // Fill in from state or tenant defaults
      if (this.state['winningWinnerHeader' + i] !== undefined) {
        winningHeader = this.state['winningWinnerHeader' + i];
      } else if (tenantVariables.defaultWinningHeader && tenantVariables.defaultWinningHeader.length > 0) {
        winningHeader = this.detectUseOfIndex(tenantVariables.defaultWinningHeader, i);
      }
      if (this.state['winningWinnerMessage' + i] !== undefined) {
        winningMessage = this.state['winningWinnerMessage' + i];
      } else if (tenantVariables.defaultWinningMessage && tenantVariables.defaultWinningMessage.length > 0) {
        winningMessage = this.detectUseOfIndex(tenantVariables.defaultWinningMessage, i);
      }

      if (this.state['winningMissedHeader' + i] !== undefined) {
        winningMissedHeader = this.state['winningMissedHeader' + i];
      } else if (tenantVariables.defaultWinningMissHeader && tenantVariables.defaultWinningMissHeader.length > 0) {
        winningMissedHeader = this.detectUseOfIndex(tenantVariables.defaultWinningMissHeader, i);
      }
      if (this.state['winningMissedMessage' + i] !== undefined) {
        winningMissedMessage = this.state['winningMissedMessage' + i];
      } else if (tenantVariables.defaultWinningMissMessage && tenantVariables.defaultWinningMissMessage.length > 0) {
        winningMissedMessage = this.detectUseOfIndex(tenantVariables.defaultWinningMissMessage, i);
      }

      if (this.state['losingHeader' + i] !== undefined) {
        losingHeader = this.state['losingHeader' + i];
      } else if (tenantVariables.defaultLosingHeader && tenantVariables.defaultLosingHeader.length > 0) {
        losingHeader = tenantVariables.defaultLosingHeader;
      }
      if (this.state['losingMessage' + i] !== undefined) {
        losingMessage = this.state['losingMessage' + i];
      } else if (tenantVariables.defaultLosingMessage && tenantVariables.defaultLosingMessage.length > 0) {
        losingMessage = tenantVariables.defaultLosingMessage;
      }

      tiermessaging.winningHeader = winningHeader;
      tiermessaging.winningMessage = winningMessage;
      tiermessaging.winningMissedHeader = winningMissedHeader;
      tiermessaging.winningMissedMessage = winningMissedMessage;
      tiermessaging.losingHeader = losingHeader;
      tiermessaging.losingMessage = losingMessage;

      // Collect local reward info:
      const rewardsAdded = this.state['rewardsAdded' + i] || [];
      if (rewardsAdded.length !== 0 && !this.state.noPrizes) {
        let totalAmount = 0;
        const readyToUploadPrizes = {};
        for (const rewardIndex in rewardsAdded) {
          const generatedRewardId = push(ref(database)).key;
          const rewardVars = { ...rewardsAdded[rewardIndex].reward };
          const amount = rewardsAdded[rewardIndex].amount || '0';
          totalAmount += parseInt(amount) || 0;

          readyToUploadPrizes[generatedRewardId] = {
            ...rewardVars,
            amount,
            codes: rewardsAdded[rewardIndex].codes || false,
            allElsePrize: rewardsAdded[rewardIndex].allElsePrize || false,
            codesArray: rewardsAdded[rewardIndex].codesArray || [],
            linksArray: rewardsAdded[rewardIndex].linksArray || [],
            pinsArray: rewardsAdded[rewardIndex].pinsArray || [],
            used: 0,
          };
        }
        readyToUploadPrizes['totalRewards'] = totalAmount;
        readyToUploadPrizes['totalRewardsUsed'] = 0;
        readyToUploadPrizes['randomPrizeOrder'] = this.state['randomOrder' + i] || false;
        readyToUploadPrizes['answerLevel'] = i;
        rewardList.push(readyToUploadPrizes);
      }
      messaging_array.push(tiermessaging);
    }

    if (rewardList.length === 0 && !this.state.noPrizes) {
      ErrorMessage.fire({
        title: 'Hold On!',
        text: 'You have no prizes added to the game! You need at least 1',
      });
      return;
    }

    // build schedule info
    createGameObject.scheduleInfo = {};
    if (showScheduleTime) {
      if (!startTime || !endTime) {
        ErrorMessage.fire({
          title: 'Hold On!',
          text: 'You have toggled on the Scheduling of the game but no start time or end time has been entered!',
        });
        return;
      }
      if (startTime.getTime() <= Date.now()) {
        ErrorMessage.fire({
          title: 'Hold On!',
          text: 'The start time cannot be before now',
        });
        return;
      } else if (startTime >= endTime) {
        ErrorMessage.fire({
          title: 'Hold On!',
          text: 'The game start time cannot be equal to or greater than the game end time!',
        });
        return;
      }
      createGameObject.scheduleInfo.status = 'scheduled';
      createGameObject.scheduleInfo.performAt = startTime.getTime();
      createGameObject.scheduleInfo.endAt = endTime.getTime();
    } else {
      createGameObject.scheduleInfo.performAt = null;
      createGameObject.scheduleInfo.endAt = null;
    }

    createGameObject.questions = questionsAdded;
    createGameObject.active = false;
    createGameObject.answered = false;
    createGameObject.firstStart = false;
    createGameObject.status = 0;
    createGameObject.rotate = false;
    createGameObject.rotationEnd = false;
    createGameObject.screenToShow = 0;
    createGameObject.questionToShow = 0;
    createGameObject.editAnswers = editAnswers;
    createGameObject.gameType = 'prediction_schedule';
    createGameObject.rewards = rewardList;
    createGameObject.timeStamp = Date.now();
    createGameObject.id = gameId;
    createGameObject.gameName = gameName;
    createGameObject.tierMessaging = messaging_array;

    // If there's a currentGame with the same name, let's store stats, etc. (as in your original code)
    const currentGame = this.state.currentGame || {};
    if (currentGame.gameName) {
      const emailsSentSnapshot = await get(ref(database, 'emailsSent'));
      const emailsSentCount = emailsSentSnapshot.size || 0;
      let userAnswerCount = this.state.userAnswerCount || 0;
      currentGame.users = this.state.userGameHistory;
      currentGame.answers = userAnswerCount;
      currentGame.prizesWon = emailsSentCount;
      currentGame.tier_messages = this.state.tierMessaging || '';
      currentGame.active = null;
      currentGame.answered = null;
      currentGame.prizeType = null;
      currentGame.firstStart = null;
      currentGame.showPercentages = null;
      currentGame.timeMinutes = null;
    }

    this.setState({loading: true})

    // Save userAnswersHistory
    const sortPlayersForAdminResult = await this.sortPlayersForAdmin();
    // store them
    await set(ref(database, `userAnswersHistory/${currentGame.id}`), sortPlayersForAdminResult[0]);

    // push new game to 'gamesList'
    const newGamesListRef = push(ref(database, 'gamesList'));
    await set(newGamesListRef, currentGame);
    // or if you intended to store createGameObject instead, do `await set(newGamesListRef, createGameObject)`
    // (Your original code is a bit ambiguous, but presumably you want to store the "old game" details after ending and create a new one.)

    // Now handle final state updates once new game is created
    this.setState(
        {
          currentGame: createGameObject,
          emailsSent: null,
          modal: false,
          currentUserAnswersState: [],
          questionsAdded: [],
          editAnswers: false,
        }, async () => {
          // reset relevant fields
          for (let i = 0; i < questionsAdded.length + 1; i++) {
            this.setState({
              ['ticket_select' + i]: null,
              ['rewardAmount' + i]: null,
              ['codes' + i]: null,
              ['codesArray' + i]: null,
              ['linksArray' + i]: null,
              ['pinsArray' + i]: null,
              ['ticket_select_all_else' + i]: null,
              ['winningWinnerHeader' + i]: null,
              ['winningWinnerMessage' + i]: null,
              ['winningMissedHeader' + i]: null,
              ['winningMissedMessage' + i]: null,
              ['losingHeader' + i]: null,
              ['losingMessage' + i]: null,
              ['rewardsAdded' + i]: null,
            });
          }
          // Clear userAnswers, emailsSent, etc. for the new game
          await set(ref(database, 'userAnswers'), null);
          await set(ref(database, 'emailsSent'), null);
          await set(ref(database, 'prizeWon'), null);

          const currentGameRef = ref(database, 'currentGame');
          await set(currentGameRef, createGameObject);

          // watch new game ID
          console.log("gameId: ", gameId)
          this.setGameToWatch(gameId);
          this.setState({loading: false})
        }
    );
  }

  detectUseOfIndex(text, index) {
    return text.replace(/%index%/g, index);
  }

  async stopGame() {
    await this.setState({loading: true});
    await set(ref(database, "currentGame/active"), false);
    await this.setState({loading: false});
    await Toast.fire({
      title: 'Game Stopped'
    });
  }

  async startGame() {
    await this.setState({loading: true});
    const updateObject = {};
    updateObject["currentGame/active"] = true;
    updateObject["currentGame/firstStart"] = true;
    updateObject["currentGame/timeStamp"] = Date.now();
    await update(ref(database), updateObject);
    await this.setState({loading: false});
    await Toast.fire({
      title: 'Game Started'
    });
  }

  endGame() {
    this.togglePredictionsAnsweredModal();
  }

  togglePredictionsAnsweredModal() {
    this.setState({
      predictionsAnsweredModal: !this.state.predictionsAnsweredModal,
    });
  }

  setAnswerCorrect(answerId, questionId) {
    const currentGame = { ...(this.state.currentGame || {}) };

    const questions = currentGame.questions || [];
    let questionIndex = questions.findIndex(q => q.id === questionId);
    if (questionIndex === -1) return; // Not found, bail out

    // Mark the correct answer
    questions[questionIndex].answers.forEach((ans) => {
      ans.correct = ans.id === answerId;
    });

    // Update local state
    this.setState({ currentGame }, () => {
      // Build partial update
      const updates = {};
      updates[`/currentGame/questions/${questionIndex}/answers`] = questions[questionIndex].answers;

      update(ref(database), updates)
          .then(() => {
            console.log('Answers updated in the DB (partial update).');
          })
          .catch((err) => {
            console.error('Error updating answers:', err);
          });
    });
  }

  async calculateWinners() {
    this.setState({ loading: true });
    const currentGame = this.state.currentGame || {};

    // fetch users
    const usersSnap = await get(ref(database, 'users'));
    const users = usersSnap.val() || {};

    // gather correct answers
    const questions = currentGame.questions || [];
    const correctAnswers = [];
    questions.forEach((q) => {
      (q.answers || []).forEach((a) => {
        if (a.correct) {
          correctAnswers.push(a.id);
        }
      });
    });

    // fetch userAnswers
    const userAnswersSnap = await get(ref(database, 'userAnswers'));
    const userAnswersData = userAnswersSnap.val() || {};

    const usersAnswersAttempted = [];
    for (let userId in userAnswersData) {
      const answersObj = userAnswersData[userId];
      const timeStamp = answersObj.timeStamp;
      let correctAnswersCount = 0;

      // count correct
      for (let ansKey in answersObj) {
        if (correctAnswers.includes(answersObj[ansKey])) {
          correctAnswersCount++;
        }
      }

      if (users[userId]) {
        // build final user data
        usersAnswersAttempted.push({
          timeStamp,
          correctAnswers: correctAnswersCount,
          email: users[userId].email,
          name: users[userId].name,
          uid: userId
        });
      }
    }

    const sortedRewards = currentGame.rewards || [];

    // proceed to send rewards
    this.sendRewardsToPlayers(sortedRewards, usersAnswersAttempted);
  }

  async sendRewardsToPlayers(rewardsLevels, currentGameuserAnswersArray) {
    // if no one
    if (currentGameuserAnswersArray.length === 0) {
      Toast.fire({
        title: 'No Winners!',
      });
      this.setState({ loading: false });
      return;
    }

    // If you have a cloud function to handle sending, call it:
    const adminRewardsData = {
      rewardsLevels,
      currentGameUserAnswers: currentGameuserAnswersArray,
      tenantVariables: this.state.tenantVariables,
    };

    let url = `https://us-central1-${process.env.REACT_APP_FIREBASE_PROJECT_ID}.cloudfunctions.net/api/sendRewardsToFans`;
    if (process.env.NODE_ENV === 'development') {
      url = `http://localhost:5001/${process.env.REACT_APP_FIREBASE_PROJECT_ID}/us-central1/api/sendRewardsToFans`;
    }
    const bearerToken = await this.props.currentUser.getIdToken();
    const bearerTokenString = "Bearer " + bearerToken;

    fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'authorization': bearerTokenString
      },
      body: JSON.stringify(adminRewardsData),
    })
        .then((res) => {
          if (!res) {
            throw new Error('No response');
          }
          return res.json();
        })
        .then(async (value) => {
          console.log(value)
          if (value.result === 'finished') {
            const currentUserAnswersState = await this.sortPlayersForAdmin(this.state.itemsToShow);
            const [arr, showLink] = currentUserAnswersState;
            const currentGame = { ...this.state.currentGame };
            currentGame.answered = true;
            await set(ref(database, "currentGame/answered"), true);

            this.setState({
              currentUserAnswersState: arr,
              showLinkColumn: showLink,
              predictionsAnsweredModal: false,
              currentGame,
              loading: false,
            });
            Toast.fire({ title: 'Emails Sent!' });
          } else {
            throw new Error('Unexpected result from function');
          }
        })
        .catch((err) => {
          console.error(err);
          ErrorMessage.fire({
            title: 'Something went wrong!',
            text: 'Check your internet connection and try again!',
          });
          this.setState({ loading: false });
        });
  }

  handleChange(evt) {
    const target = evt.target;
    const value = target.type === 'checkbox' ? target.checked : target.value;
    this.setState({ [target.name]: value });
  }

  toggle() {
    const questionsAdded = this.state.questionsAdded || [];
    const questionsAddedLength = questionsAdded.length;
    let answersAddedState = {
      modal: !this.state.modal,
      wizardLocation: 'first',
      question: 0,
      editAnswers: false,
    };
    // clear out some ephemeral local states
    for (let i = 0; i < questionsAddedLength; i++) {
      answersAddedState['rewardsAdded' + i] = [];
      answersAddedState['ticket_select' + i] = null;
      answersAddedState['rewardAmount' + i] = null;
      answersAddedState['codes' + i] = null;
      answersAddedState['codesArray' + i] = null;
      answersAddedState['linksArray' + i] = null;
      answersAddedState['pinsArray' + i] = null;
      answersAddedState['ticket_select_all_else' + i] = null;
      answersAddedState['winningWinnerHeader' + i] = null;
      answersAddedState['winningWinnerMessage' + i] = null;
      answersAddedState['winningMissedHeader' + i] = null;
      answersAddedState['winningMissedMessage' + i] = null;
      answersAddedState['losingHeader' + i] = null;
      answersAddedState['losingMessage' + i] = null;
      answersAddedState['rewardsAdded' + i] = null;
    }
    this.setState(answersAddedState);
  }

  async resetGame() {
    const result = await WarningMessage.fire({
      title: 'STOP!',
      text: 'Are you sure? This will erase all game info. Only do this if no one has played yet!',
      confirmButtonText: 'YES I WANT TO RESET THE GAME',
    });
    if (!result || !result.value) return;
    this.setState({loading: true})
    let currentGameState = this.state.currentGame || {};

    Object.assign(currentGameState, {
      active: false,
      answered: false,
      rotationEnd: false,
      startRotation: false,
      screenToShow: 0,
      rotate: false,
      startQuestionToShowTimer: null,
      questions: currentGameState.questions.map(q => ({
        ...q,
        shown: false,
        answers: (q.answers || []).map(ans => ({
          ...ans,
          correct: false,
        })),
      })),
      rewards: (currentGameState.rewards ?? []).map(rewardLevel => ({
        ...rewardLevel,
        totalRewardsUsed: 0,
        ...Object.keys(rewardLevel).reduce((acc, key) => {
          if (typeof rewardLevel[key] === "object") {
            acc[key] = { ...rewardLevel[key], used: 0 };
          }
          return acc;
        }, {})
      }))
    });

    // remove userGameHistory references for this game
    const historySnapshot = await get(query(ref(database, `userGameHistory`), orderByChild(currentGameState.id), equalTo(currentGameState.id)));
    if (historySnapshot.exists()) {
      const historyVal = historySnapshot.val() || {};
      for (const key in historyVal) {
        if (historyVal[key] && historyVal[key][currentGameState.id]) {
          // remove just this game from each child
          await set(ref(database, `userGameHistory/${key}/${currentGameState.id}`), null);
        }
      }
    }

    if (currentGameState.id) {
      try {
        await set(ref(database, `currentGameFormFilled/${currentGameState.id}`), null);
      } catch (e) {
        console.log(e)
      }
    }

    // Clear out relevant ephemeral data
    try {
      await Promise.all([
        set(ref(database, 'emailsSent'), null),
        set(ref(database, 'userAnswers'), null),
        set(ref(database, 'prizeWon'), null),
        set(ref(database, "currentGame/active"), false),
        set(ref(database, "currentGame/firstStart"), false),
        set(ref(database, "currentGame/answered"), false),
        set(ref(database, "currentGame/rotationEnd"), false),
        set(ref(database, "currentGame/startRotation"), false),
        set(ref(database, "currentGame/screenToShow"), 0),
        set(ref(database, "currentGame/rotate"), false),
        set(ref(database, "currentGame/status"), 0),
        set(ref(database, "currentGame/questionToShow"), 0),
        set(ref(database, "currentGame/questions"), currentGameState.questions)
      ]);
    } catch (e) {
      console.log(e)
    }

    this.setState({
      question: 0,
      currentUserAnswersState: [],
      currentGame: currentGameState,
      loading: false
    });
  }

  async freezePicks() {
    await this.setState({loading: true});
    const currentGame = { ...(this.state.currentGame || {}) };
    const updateObject = {};
    updateObject["currentGame/status"] = currentGame.status === 1 ? 0 : 1;
    await update(ref(database), updateObject);
    await this.setState({loading: false});
  }

  navButtonClicked(direction) {
    const currentLocation = this.state.wizardLocation;
    if (direction === 'prev') {
      if (currentLocation === 'second') {
        this.setState({ wizardLocation: 'first' });
        this.toggleWizardLocation('first', 'second', 'third', 'fourth');
      } else if (currentLocation === 'third') {
        this.setState({ wizardLocation: 'second' });
        this.toggleWizardLocation('second', 'first', 'third', 'fourth');
      } else if (currentLocation === 'fourth') {
        this.setState({ wizardLocation: 'third' });
        this.toggleWizardLocation('third', 'first', 'second', 'fourth');
      } else {
        this.setState({ wizardLocation: 'first' });
      }
    } else {
      // 'next'
      if (currentLocation === 'first') {
        this.setState({ wizardLocation: 'second' });
        this.toggleWizardLocation('second', 'first', 'third', 'fourth');
      } else if (currentLocation === 'second') {
        this.setState({ wizardLocation: 'third' });
        this.toggleWizardLocation('third', 'first', 'second', 'fourth');
      } else if (currentLocation === 'third') {
        this.setState({ wizardLocation: 'fourth' });
        this.toggleWizardLocation('fourth', 'first', 'second', 'third');
      } else {
        this.setState({ wizardLocation: 'first' });
      }
    }
  }

  toggleWizardLocation(tabClicked, otherTab1, otherTab2, otherTab3) {
    this.setState({ wizardLocation: tabClicked });
    document.getElementById(tabClicked).classList.add('active', 'show');
    document.getElementById(otherTab1).classList.remove('active', 'show');
    document.getElementById(otherTab2).classList.remove('active', 'show');
    document.getElementById(otherTab3).classList.remove('active', 'show');

    document.getElementById(tabClicked + '1').classList.add('active', 'show');
    document.getElementById(otherTab1 + '1').classList.remove('active', 'show');
    document.getElementById(otherTab2 + '1').classList.remove('active', 'show');
    document.getElementById(otherTab3 + '1').classList.remove('active', 'show');
  }

  async switchStatsPrizes() {
    if (this.state.showStats) {
      document.getElementById('showPrizes').classList.remove('active');
      document.getElementById('showStats').classList.add('active');
      this.setState({ showStats: false });
    } else {
      document.getElementById('showPrizes').classList.add('active');
      document.getElementById('showStats').classList.remove('active');
      this.setState({ loading: true });
      const [arr, showLink] = await this.sortPlayersForAdmin();
      this.setState({
        showStats: true,
        loading: false,
        currentUserAnswersState: arr,
        showLinkColumn: showLink,
      });
    }
  }

  removeFromToQuestionAddArray(index) {
    const answerArray = [...this.state.questionsAdded];
    answerArray.splice(index, 1);
    this.setState({ questionsAdded: answerArray });
  }

  addQuestionToLocalArray() {
    let selectedQuestion = null;
    const questionsAddedArray = [...this.state.questionsAdded];
    const questionList = this.state.questionsList;

    // Check for duplicates
    if (questionsAddedArray.some((q) => q.key === this.state.question_select)) {
      ErrorMessage.fire({
        title: 'Question Already In Game!',
        text: 'This game already includes this question. Try another one.',
      });
      return;
    }

    // find from questionList
    questionList.forEach((q) => {
      if (q.key === this.state.question_select) {
        selectedQuestion = { ...q, id: q.key };
      }
    });

    if (selectedQuestion) {
      questionsAddedArray.push(selectedQuestion);
      this.setState({ questionsAdded: questionsAddedArray });
    }
  }

  getSnapshotFromEndpoint(endpoint, numberOfResults = null, searchData = null, orderBy = null) {
    let baseRef = ref(database, endpoint);
    if (orderBy) {
      baseRef = query(baseRef, orderByChild(orderBy));
    }
    if (numberOfResults) {
      baseRef = query(baseRef, limitToFirst(numberOfResults));
    }
    return get(baseRef); // returns a Promise
  }

  async sortPlayersForAdmin(numberOfResults = 0, searchData = null) {
    const [
      currentGameSnap,
      userAnswersSnapshot,
      emailsSentSnapshot,
      usersSnapshot
    ] = await Promise.all([
      this.getSnapshotFromEndpoint('currentGame'),
      this.getSnapshotFromEndpoint('userAnswers', numberOfResults, searchData, 'timeStamp'),
      this.getSnapshotFromEndpoint('emailsSent'),
      this.getSnapshotFromEndpoint('users'),
    ]);

    const currentGame = currentGameSnap.val() || {};
    const userAnswersData = userAnswersSnapshot.val() || {};
    const emailsSent = emailsSentSnapshot.val() || {};
    const users = usersSnapshot.val() || {};

    // existing “participants” logic
    const correctAnswers = [];
    (currentGame.questions || []).forEach(q =>
        (q.answers || []).forEach(a => a.correct && correctAnswers.push(a.id))
    );

    const usersAnswersAttempted = [];
    let showLinkColumn = false;

    Object.entries(userAnswersData).forEach(([uid, answers]) => {
      const userEmail  = users[uid]?.email;
      let encodedEmail = uid;
      if (validateEmail(userEmail)) encodedEmail = btoa(userEmail);

      const rewardSentData = emailsSent[encodedEmail] || emailsSent[uid] || {};
      let rewardSentName = rewardSentData.name || '';
      let code           = rewardSentData.code || '';
      let link           = rewardSentData.link || '';
      if (link) showLinkColumn = true;

      const ts = answers.timeStamp;
      let correctCount = 0;
      Object.values(answers).forEach(val => {
        if (correctAnswers.includes(val)) correctCount++;
      });

      usersAnswersAttempted.push({
        uid,
        email:          userEmail,
        correctAnswers: correctCount,
        rewardSent:     rewardSentName,
        code,
        link,
        timeStamp:      ts,
      });
    });

    usersAnswersAttempted.sort((a,b) => {
      if (b.correctAnswers !== a.correctAnswers) {
        return b.correctAnswers - a.correctAnswers;
      }
      return a.timeStamp - b.timeStamp;
    });

    return [usersAnswersAttempted, showLinkColumn];
  }

  async downloadUsers() {
    this.setState({ loading: true });

    // 1) Fetch all raw data in parallel
    const [ usersSnap, userAnswersSnap, currentGameSnap ] = await Promise.all([
      get(ref(database, 'users')),
      get(ref(database, 'userAnswers')),
      get(ref(database, 'currentGame')),
    ]);

    const users           = usersSnap.val()      || {};
    const userAnswersData = userAnswersSnap.val() || {};
    const currentGame     = currentGameSnap.val() || {};
    const questions       = currentGame.questions || [];

    // 2) Build your “participant” rows via the existing helper
    const [ participantRows ] = await this.sortPlayersForAdmin();

    // 3) Build the CSV header: original columns + one per question
    const participantHeaders = [
      "Email","First Name","Last Name","Other First Name","Other Last Name",
      "Zip Code","Street","City","State","Address",
      "Birthday","Phone Number","Social Handle","Fan Response Text",
      "Fan Response Text 2","Short Text Response 1","Short Text Response 2",
      "Custom Dropdown","Opt-In","Opt-In 2","Opt-In 3","Opt-In 4",
      "YesNoQuestions","YesExplanation","YesNoQuestions2","YesExplanation2",
      "YesNoQuestions3","YesExplanation3","How They Heard","User Image",
      "UTM Campaign","UTM Medium","UTM Source","SRC Code",
      "Number of Correct Answers","Reward","Code","Link",
      "Last Sign In","Sign Up Time","Answer Time","Redeemed"
    ];
    const questionHeaders = questions.map(q => q.questionText);
    const headers = [ ...participantHeaders, ...questionHeaders ];

    // 4) Assemble each CSV row: base demographics/stats + one answerText per question
    const csvData = [ headers ];
    participantRows.forEach(row => {
      const user = users[row.uid] || {};
      const nameResponse      = findFirstAndLastName(user.name);
      const otherNameResponse = findFirstAndLastName(user.otherName);

      // base columns
      const baseRow = [
        row.email || row.uid || "",
        nameResponse[0]  || "",
        nameResponse[1]  || "",
        otherNameResponse[0] || "",
        otherNameResponse[1] || "",
        user.zipCode    || "",
        user.street     || "",
        user.city       || "",
        user.state      || "",
        user.address    || "",
        user.birthday   || "",
        user.phoneNumber|| "",
        user.socialHandle || "",
        user.fanResponseToCollectTextInput   || "",
        user.fanResponseToCollectTextInput2  || "",
        user.textInputOne   || "",
        user.textInputTwo   || "",
        user.customDropdownInput || "",
        user.optIn      || "",
        user.optInTwo   || "",
        user.optInThree || "",
        user.optInFour  || "",
        user.yesNoQuestions   || "",
        user.yesExplanation   || "",
        user.yesNoQuestions2  || "",
        user.yesExplanation2  || "",
        user.yesNoQuestions3  || "",
        user.yesExplanation3  || "",
        user.howYouHeard      || "",
        user.userImage        || "",
        user.utmCampaign      || "",
        user.utmMedium        || "",
        user.utmSource        || "",
        user.srcCode          || "",
        row.correctAnswers    || "",
        row.rewardSent        || "",
        row.code              || "",
        row.link              || "",
        user.lastSignIn
            ? convertTimeStampToHumanReadable(user.lastSignIn)
            : "",
        user.signUpTime
            ? convertTimeStampToHumanReadable(user.signUpTime)
            : "",
        row.timeStamp
            ? convertTimeStampToHumanReadable(row.timeStamp)
            : "",
        row.isRedeemed ? "true" : ""
      ];

      // one answer column per question
      const answerCells = questions.map(q => {
        const answersObj = userAnswersData[row.uid] || {};
        const chosenId   = answersObj[q.id];
        const ansObj     = (q.answers || []).find(a => a.id === chosenId);
        return ansObj ? ansObj.answerText : "";
      });

      csvData.push([ ...baseRow, ...answerCells ]);
    });

    // 5) Prune any column whose **entire** data‐rows are empty
    const isEmpty = v => v === undefined || v === null || v === "";
    const dataRows = csvData.slice(1);
    // determine which column indexes to keep
    const keepIndices = csvData[0].map((_, colIdx) =>
        dataRows.some(row => !isEmpty(row[colIdx]))
    );
    // rebuild a filtered csvData
    const prunedCsvData = csvData.map(row =>
        row.filter((_, colIdx) => keepIndices[colIdx])
    );

    const csvContent = Papa.unparse(prunedCsvData);
    const blob       = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url        = URL.createObjectURL(blob);
    const a          = document.createElement('a');
    a.href           = url;
    a.download       = `users_${new Date().toISOString().slice(0,10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);

    this.setState({ loading: false });
  }

  addRewardToLocalArray(index) {
    const rewardAmount = this.state['rewardAmount' + index];
    let allElsePrize = this.state['allElsePrize' + index];
    if (index === 0) {
      allElsePrize = true;
    }
    const rewardId = this.state['ticket_select' + index];
    const codes = this.state['codes' + index];
    const links = this.state['links' + index];
    let codesArray = this.state['codesArray' + index] || '';
    let linksArray = this.state['linksArray' + index] || '';
    let pinsArray = this.state['pinsArray' + index] || '';

    codesArray = codesArray.replace(/\n/g, ' ');
    linksArray = linksArray.replace(/\n/g, ' ');
    pinsArray = pinsArray.replace(/\n/g, ' ');

    if (!rewardId) {
      ErrorMessage.fire({
        title: 'Missing field!',
        text: 'Must select a reward before adding!',
      });
      return;
    }

    if (!allElsePrize) {
      // for normal prizes
      if (!rewardAmount || rewardAmount < 1) {
        ErrorMessage.fire({
          title: 'Missing Amount',
          text: 'Missing reward or amount of reward.  Need a valid amount for this prize tier.',
        });
        return;
      }
    }

    // check code arrays
    let totalCodes = [];
    let totalLinks = [];
    let totalPins = [];

    if (codes && !allElsePrize) {
      if (!codesArray.trim()) {
        ErrorMessage.fire({
          title: 'Hold On!',
          text: 'Must enter codes or uncheck codes box!',
        });
        return;
      }
      totalCodes = detectHowManyCodesEntered(codesArray);
      totalPins = detectHowManyCodesEntered(pinsArray);
      if (Array.isArray(totalCodes) && totalCodes.length !== parseInt(rewardAmount, 10)) {
        ErrorMessage.fire({
          title: 'Codes not equal!',
          text: `# of codes must equal the number of rewards. Detected ${totalCodes.length} vs. ${rewardAmount}`,
        });
        return;
      } else if (Array.isArray(totalPins) && totalPins.length !== 0 && totalPins.length !== parseInt(rewardAmount, 10)) {
        ErrorMessage.fire({
          title: 'Pins not equal!',
          text: `# of pins must equal the number of rewards. Detected ${totalPins.length} vs. ${rewardAmount}`,
        });
        return;
      }
      if (!Array.isArray(totalCodes) && totalCodes.inValidUrl) {
        ErrorMessage.fire({
          title: 'Invalid Code',
          text: `${totalCodes.inValidUrl} is not valid`,
        });
        return;
      }
    }

    // check links
    if (links && !allElsePrize) {
      if (!linksArray.trim()) {
        ErrorMessage.fire({
          title: 'Hold on!',
          text: 'Must enter links or uncheck links box!',
        });
        return;
      }
      totalLinks = detectHowManyCodesEntered(linksArray, true);
      if (totalLinks.inValidUrl) {
        ErrorMessage.fire({
          title: 'Invalid URL Detected!',
          text: `Links must be valid. In this case: ${totalLinks.inValidUrl} is not valid`,
        });
        return;
      }
      if (
          Array.isArray(totalLinks) &&
          totalLinks.length !== parseInt(rewardAmount, 10)
      ) {
        ErrorMessage.fire({
          title: 'Links not equal!',
          text: `# of links must equal the number of rewards. Found ${totalLinks.length} vs. ${rewardAmount}`,
        });
        return;
      }
    }

    // build reward object
    let rewardToAddObject = null;
    (this.state.ticketList || []).forEach((ticket) => {
      if (ticket.key === rewardId) {
        rewardToAddObject = {
          reward: ticket,
          allElsePrize,
          amount: allElsePrize ? null : rewardAmount,
          codes: allElsePrize ? false : codes,
          links: allElsePrize ? false : links,
          codesArray: allElsePrize ? null : totalCodes,
          linksArray: allElsePrize ? null : totalLinks,
          pinsArray: allElsePrize ? null : totalPins,
        };
      }
    });

    if (!rewardToAddObject) {
      ErrorMessage.fire({
        title: 'Prize not found!',
        text: 'Could not find that reward in the ticketList',
      });
      return;
    }

    let array = [...(this.state['rewardsAdded' + index] || [])];
    // check for duplicates
    if (array.some((item) => item.reward.key === rewardId)) {
      ErrorMessage.fire({
        title: 'Prize already added!',
        text: 'You have already added this prize to this tier.',
      });
      return;
    }
    // check if there's already an "allElsePrize" in the same tier
    if (array.some((item) => item.allElsePrize) && allElsePrize) {
      ErrorMessage.fire({
        title: 'Hold On!',
        text: 'Cannot add two All Else Prizes to the same tier.',
      });
      return;
    }

    array.push(rewardToAddObject);
    this.setState({
      ['rewardsAdded' + index]: array,
    });
  }

  removeFromToAddArray(index, tier) {
    let rewardArray = [...(this.state['rewardsAdded' + tier] || [])];
    rewardArray.splice(index, 1);
    this.setState({
      ['rewardsAdded' + tier]: rewardArray,
    });
  }

  async searchFirebaseData(searchData) {
    this.setState({ loading: true });
    let numberOfResults = this.state.itemsPerPage;
    if (searchData) {
      numberOfResults = null;
    }
    const organizeUserAnswersArray = await this.sortPlayersForAdmin(numberOfResults, searchData);
    this.setState({
      loading: false,
      currentUserAnswersState: organizeUserAnswersArray[0],
      showLinkColumn: organizeUserAnswersArray[1],
    });
  }

  render() {
    let selectedGame = this.state.currentGame || null;
    let selectedGameQuestions = [];
    let selectedGameRewards = [];
    let status = 0;
    let userAnswersCount = this.state.userAnswerCount || 0;
    let currentUserAnswersState = this.state.currentUserAnswersState || [];
    let hideEndGameButton = false;
    let startTimeFirstPart = null;
    let startTimeSecondPart = null;
    let endTimeSecondPart = null;
    let endTimeFirstPart = null;
    let gameScheduledStatus = "completed";
    let votingStarted;
    let allPredictionsAnswered;
    if(selectedGame && selectedGame.id){
      selectedGameQuestions = selectedGame.questions || [];
      status = selectedGame.status;
      allPredictionsAnswered = true
      let selectedQuestionsCount = 0;
      for(let questionIndex in selectedGameQuestions){
        const question = selectedGameQuestions[questionIndex];
        if(question && question.answers){
          for(const answerIndex in question.answers){
            const answer = question.answers[answerIndex]
            if(answer.correct){
              selectedQuestionsCount++;
            }
          }
        }
      }
      if(selectedQuestionsCount !== selectedGameQuestions.length) {
        allPredictionsAnswered = false;
      }
      selectedGameRewards = selectedGame.rewards || [];
      votingStarted = selectedGame.active;

      if(selectedGame.answered || this.state.emailsSent || (selectedGame.rotationEnd && selectedGameRewards.length === 0) || (selectedGame.gameTiming === "scheduled")){
        hideEndGameButton = true
      }
      if(selectedGame.answered || this.state.emailsSent || selectedGame.rotationEnd){
        selectedGame.answered = true
      }
      if(selectedGame.scheduleInfo){
        startTimeFirstPart = new Date(selectedGame.scheduleInfo.performAt).toLocaleDateString();
        startTimeSecondPart = new Date(selectedGame.scheduleInfo.performAt).toLocaleTimeString();
        endTimeFirstPart = new Date(selectedGame.scheduleInfo.endAt).toLocaleDateString();
        endTimeSecondPart = new Date(selectedGame.scheduleInfo.endAt).toLocaleTimeString();
        gameScheduledStatus = selectedGame.scheduleInfo.status
      }
    } else if(selectedGame && !selectedGame.id){
      selectedGame = null;
    }
    const vm = this;

    return (
        <div className="admin-wrapper">
          <div className="loading-screen" style={{ display: this.state.loading ? 'block' : 'none' }}/>
          <SideMenu />
          <TopMenu />
          <div className="admin-main-panel">
            <div className="container" style={{ padding: '20px', backgroundColor: '#e3eaef' }}>
              <div className="row">
                <div className="col-md-2" style={{ display: selectedGame && selectedGame.answered ? '' : 'none' }}>
                  <div className="card" style={{backgroundColor: '#fe3b4b', width: '100%', textAlign: 'center', height: '50px'}}>
                    <p style={{ lineHeight: '50px' }}>Game Ended</p>
                  </div>
                </div>

                {selectedGame && !selectedGame.answered && (
                    <div className="col-md-3">
                      <div className="card"
                          style={{
                            backgroundColor: '#00c78c',
                            width: '100%',
                            textAlign: 'center',
                            height: '50px',
                            display: votingStarted ? '' : 'none',
                            float: 'left',
                          }}
                      >
                        <p style={{ lineHeight: '50px' }}>Predictions Are Live</p>
                      </div>

                      <div className="card" style={{backgroundColor: '#fe3b4b',
                            width: '100%',
                            textAlign: 'center',
                            height: '50px',
                            display: !votingStarted ? '' : 'none',
                            float: 'left',
                          }}>
                        <p style={{ lineHeight: '50px' }}>Predictions Are Not Live</p>
                      </div>
                    </div>
                )}

                {selectedGame && !selectedGame.answered && (
                    <center className="col-md-1" style={{ color: 'black' }}>
                      Advanced
                      <input
                          id="advanceSettings"
                          name="advanceSettings"
                          type="checkbox"
                          checked={this.state.advanceSettings}
                          onChange={this.handleChange}
                      />
                    </center>
                )}

                {selectedGame && !selectedGame.answered && (
                    <div className="col-md-3">
                      <button
                          onClick={() => this.freezePicks()}
                          className="btn btn-primary btn-lg start-game-button"
                          style={{
                            display: !selectedGame.active || status === 2 || !this.state.advanceSettings ? 'none' : '',
                            float: 'left',
                            height: '52px',
                            marginBottom: 10,
                          }}
                      >
                        {status !== 1 ? 'Freeze' : 'Unfreeze'}
                      </button>

                      <button
                          onClick={() => this.startGame()}
                          className="btn btn-primary btn-lg start-game-button"
                          style={{ display: votingStarted ? 'none' : '', float: 'left', height: '52px' }}
                      >
                        Start Predictions
                      </button>

                      <button
                          onClick={() => this.stopGame()}
                          className="btn btn-primary btn-lg end-game-button"
                          style={{
                            display: votingStarted && this.state.advanceSettings ? '' : 'none',
                            float: 'left',
                            height: '52px',
                          }}
                      >
                        End Predictions
                      </button>
                    </div>
                )}

                <div className="col-md-2">
                  <button
                      onClick={() => this.endGame()}
                      className="btn btn-primary btn-lg"
                      style={{
                        fontSize: '0.8rem',
                        display: selectedGame && !hideEndGameButton ? '' : 'none',
                        float: 'left',
                        height: '52px',
                      }}
                  >
                    Answer
                  </button>
                </div>

                <div className="col-md-3">
                  <button onClick={() => this.resetGame()} className="btn btn-outline-danger btn-sm" style={{display: selectedGame && !selectedGame.key ? '' : 'none', marginTop: '7px', float: 'right'}}>
                    Reset Game
                  </button>
                  <button onClick={() => this.toggle()} className="btn btn-primary btn-lg create-game-button" style={{ float: 'right', marginRight: '5px' }}>
                    New Game
                  </button>
                </div>
              </div>
            </div>

            {/* Selected Game Info */}
            <center style={{ display: !selectedGame ? 'none' : 'block' }}>
              <div className="container">
                <div className="row">
                  {/* Start/End times */}
                  {startTimeFirstPart && (
                      <div className="col-md-4" style={{color: 'black', border: 'solid 1px #d3d3d3', margin: 10, borderRadius: 5}}>
                        <div className="row">
                          <div className="col-md-6">
                            <u style={{ color: '#353839' }}>Starts</u>
                            <br />
                            {selectedGame?.scheduleInfo?.performAt ? (
                                <span style={{ fontSize: 18 }}>
                                  {startTimeFirstPart}
                                  <br />
                                  {startTimeSecondPart}
                                </span>
                            ) : (
                                <span style={{ fontSize: 18 }}>No Scheduled Start</span>
                            )}
                          </div>
                          <div className="col-md-6">
                            <u style={{ color: '#353839' }}>Ends</u>
                            <br />
                            {selectedGame?.scheduleInfo?.endAt ? (
                                <span style={{ fontSize: 18 }}>
                                  {endTimeFirstPart}<br />{endTimeSecondPart}
                                </span>
                            ) : (
                                <span style={{ fontSize: 18 }}>No Scheduled End</span>
                            )}
                          </div>
                        </div>
                      </div>
                  )}

                  <div className="col-md-2" style={{color: 'black', border: 'solid 1px #d3d3d3', marginTop: 10, marginBottom: 10, marginLeft: 10, borderRadius: 5}}>
                    <div className="row">
                      <div className="col-md-12" style={{ textAlign: 'center' }}>
                        <span style={{ fontSize: 12 }}>Answers</span>
                        <footer className="value-text">{userAnswersCount}</footer>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </center>

            {/* Tabs for "Game Details" / "Results" */}
            <div style={{ display: selectedGame ? '' : 'none' }}>
              <div className="card-body">
                <ul className="nav nav-tabs nav-justified nav-bordered mb-3">
                  <li className="nav-item" onClick={() => this.switchStatsPrizes()}>
                    <a href="#" data-toggle="tab" aria-expanded="false" className="nav-link active" id="showStats" style={{ backgroundColor: '#fafbfe' }}>
                      <i className="mdi mdi-home-variant d-lg-none d-block mr-1" />
                      <span className="d-none d-lg-block">Game Details</span>
                    </a>
                  </li>
                  <li className="nav-item" onClick={() => this.switchStatsPrizes()}>
                    <a href="#" data-toggle="tab" aria-expanded="true" className="nav-link" id="showPrizes" style={{ backgroundColor: '#fafbfe' }}>
                      <i className="mdi mdi-account-circle d-lg-none d-block mr-1" />
                      <span className="d-none d-lg-block">Results</span>
                    </a>
                  </li>
                </ul>

                {/* Stats / Participants Table */}
                <div style={{ display: this.state.showStats ? 'block' : 'none', marginLeft: 10 }}>
                  <div className="row">
                    <div className="col-6">
                      <div className="export-button-styles btn btn-primary btn-lg download-button" onClick={() => this.downloadUsers()}>
                        <span className="fa fa-arrow-circle-down" /> Download Participants
                      </div>
                    </div>
                    <div className="col-6 align-self-end">
                        <input
                            style={{minWidth: 350, float: "right"}}
                            id="searchQuery"
                            name="searchQuery"
                            className="form-control"
                            placeholder="Filter By Prize Name (Case Sensitive)"
                            type="text"
                            onChange={() => {
                              clearTimeout(this.timeoutId);
                              this.timeoutId = setTimeout(() => {
                                let input = document.getElementById('searchQuery').value;
                                this.searchFirebaseData(input);
                              }, 500);
                            }}
                        />
                    </div>
                  </div>

                  <div style={{ height: '10px', width: '100%' }} />
                  <table className="table table-striped" style={{ color: 'black' }}>
                    <tbody>
                    <tr>
                      <th>Email</th>
                      <th>Number Correct</th>
                      <th>Time Stamp</th>
                      <th>Place</th>
                      <th>Reward Sent</th>
                      <th>Code</th>
                      {this.state.showLinkColumn && <th>Link</th>}
                    </tr>
                    {currentUserAnswersState.map((item, i) => {
                      return (
                          <tr key={i}>
                            <td style={{ fontFamily: 'Open Sans' }}>{item.email || item.uid}</td>
                            <td style={{ fontFamily: 'Open Sans' }}>{item.correctAnswers}</td>
                            <td style={{ fontFamily: 'Open Sans' }}>
                              {convertTimeStampToHumanReadable(item.timeStamp)}
                            </td>
                            <td style={{ fontFamily: 'Open Sans' }}>{i + 1}</td>
                            <td style={{ fontFamily: 'Open Sans' }}>
                              {item.rewardSent || 'NONE'}
                            </td>
                            <td style={{ fontFamily: 'Open Sans' }}>{item.code || 'NONE'}</td>
                            {this.state.showLinkColumn && (
                                <td style={{ fontFamily: 'Open Sans' }}>{item.link || 'NONE'}</td>
                            )}
                          </tr>
                      );
                    })}
                    </tbody>
                  </table>
                </div>

                <div style={{ display: !this.state.showStats ? 'block' : 'none' }}>
                  <div className="container">
                    <div className="row">
                      <div className="col-md-6" style={{ textAlign: 'center' }}>
                        <h4 style={{ color: 'black' }}>Rewards</h4>
                        {selectedGameRewards && selectedGameRewards.length > 0 ? (
                            <Accordion style={{ margin: 10 }}>
                              {selectedGameRewards
                                  .sort((a, b) => a.answerLevel - b.answerLevel)
                                  .map((item, i) => {
                                    // parse out the reward objects
                                    const rewards = [];
                                    let allElseReward = null;
                                    Object.keys(item).forEach((k) => {
                                      const val = item[k];
                                      if (val && typeof val === 'object' && val.rewardName) {
                                        if (val.allElsePrize) {
                                          allElseReward = val;
                                        } else {
                                          rewards.push(val);
                                        }
                                      }
                                    });

                                    return (
                                        <AccordionItem className="blackBackgroundColor" bodyClassName="changeBackgroundColor" key={i} title={`${item.answerLevel} correct`} expanded={i === 0}>
                                          {rewards.map((r, idx) => (
                                              <div style={{ color: 'black' }} key={idx}>
                                      <span>
                                        {r.amount}, {r.rewardName}
                                      </span>
                                              </div>
                                          ))}

                                          {allElseReward && (
                                              <div style={{ color: 'black' }}>
                                                {rewards.length > 0 && <br />}
                                                <span>
                                                  <span style={{color: 'grey', fontWeight: 100, fontFamily: 'sans-serif'}}>
                                                    Everyone Else Wins
                                                  </span>{' '}
                                                  {allElseReward.rewardName}
                                                </span>
                                              </div>
                                          )}
                                        </AccordionItem>
                                    );
                                  })}
                            </Accordion>
                        ) : (
                            <span style={{ color: 'black' }}>No Rewards Added</span>
                        )}
                      </div>

                      <div className="col-md-6 justify-content-center" style={{ textAlign: 'center' }}>
                        <h4 style={{ color: 'black' }}>Predictions</h4>
                        <Carousel
                            style={{ backgroundColor: 'white' }}
                            showArrows={true}
                            showStatus={false}
                            showIndicators={false}
                            showThumbs={false}
                            selectedItem={this.state.selectedItem}
                            onChange={(e) => {
                              this.setState({ selectedItem: e });
                            }}
                        >
                          {selectedGameQuestions.map((q, i) => (
                              <div style={{ backgroundColor: '#FAFBFE', padding: 10 }} key={q.id || i}>
                                <p style={{ color: 'black' }}>
                                  {i + 1}/{selectedGameQuestions.length}
                                </p>
                                <p style={{ color: 'black' }}>{q.questionText}</p>
                                <ol style={{ textAlign: 'left' }}>
                                  {q.answers.map((ans, j) =>
                                      ans.correct ? (
                                          <li key={j} style={{ color: 'green' }}>
                                            {ans.answerText}
                                          </li>
                                      ) : (
                                          <li key={j} style={{ color: 'black' }}>
                                            {ans.answerText}
                                          </li>
                                      )
                                  )}
                                </ol>
                              </div>
                          ))}
                        </Carousel>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* CREATE GAME MODAL */}
          <Modal isOpen={this.state.modal} toggle={this.toggle} style={{ width: '90%' }} id="myModal">
            <div className="card">
              <div className="card-body">
                <h4 className="header-title mb-3"> Create Game</h4>
                <div id="rootwizard">
                  <ul className="nav nav-pills bg-dark-light nav-justified mb-3">
                    <li className="nav-item" onClick={() => this.toggleWizardLocation('first', 'second', 'third', 'fourth')}>
                      <a href="#" className="nav-link rounded-0 pt-2 pb-2 active show" id="first1">
                        <span className="fa fa-pencil-square-o" />
                        <span className="d-none d-sm-inline"> The Basics</span>
                      </a>
                    </li>

                    <li className="nav-item" onClick={() => this.toggleWizardLocation('second', 'first', 'third', 'fourth')}>
                      <a href="#" className="nav-link rounded-0 pt-2 pb-2" id="second1">
                        <span className="fa fa-question" />
                        <span className="d-none d-sm-inline"> Add Predictions</span>
                      </a>
                    </li>
                    <li className="nav-item" onClick={() => this.toggleWizardLocation('third', 'first', 'second', 'fourth')}>
                      <a href="#" className="nav-link rounded-0 pt-2 pb-2" id="third1">
                        <span className="fa fa-trophy" />
                        <span className="d-none d-sm-inline"> Add Prizes</span>
                      </a>
                    </li>
                    <li className="nav-item" onClick={() => this.toggleWizardLocation('fourth', 'first', 'second', 'third')}>
                      <a href="#" className="nav-link rounded-0 pt-2 pb-2" id="fourth1">
                        <span className="fa fa-sign-out" />
                        <span className="d-none d-sm-inline"> Finish</span>
                      </a>
                    </li>
                  </ul>

                  <div className="tab-content mb-0 b-0" style={{ fontFamily: 'Roboto' }}>
                    <div className="tab-pane active show" id="first">
                      <form id="accountForm" className="form-horizontal">
                        <div className="row">
                          <div className="col-12">
                            <div className="form-group row mb-3">
                              <label className="col-md-3 col-form-label" htmlFor="gameName">
                                {' '}
                                Game Name
                              </label>
                              <div className="col-md-9">
                                <input
                                    id="gameName"
                                    name="gameName"
                                    type="text"
                                    className="form-control"
                                    value={this.state.gameName}
                                    onChange={this.handleChange}
                                    placeholder="12/11 vs MonStars"
                                />
                              </div>
                            </div>
                          </div>
                        </div>

                        {!this.state.gameTiming && (
                            <div className="form-group">
                              <label htmlFor="showScheduleTime">Set Schedule Time</label>
                              <br />
                              <input
                                  type="checkbox"
                                  checked={this.state.showScheduleTime}
                                  id="showScheduleTime"
                                  name="showScheduleTime"
                                  onChange={this.handleChange}
                              />
                            </div>
                        )}

                        {(this.state.showScheduleTime || this.state.gameTiming === 'scheduled') && (
                            <>
                              <div className="form-group row mb-3">
                                <label className="col-md-3 col-form-label" htmlFor="startTime">
                                  {' '}
                                  Set Start Time
                                </label>
                                <div className="col-md-9">
                                  <DatePicker
                                      showTimeInput
                                      dateFormat="Pp"
                                      selected={this.state.startTime}
                                      onChange={(date) => this.setState({ startTime: date })}
                                  />
                                </div>
                              </div>

                              <div
                                  className="form-group row mb-3"
                                  style={{ display: this.state.gameTiming !== 'manual' ? 'flex' : 'none' }}
                              >
                                <label className="col-md-3 col-form-label" htmlFor="endTime">
                                  {this.state.gameTiming === 'scheduled'
                                      ? 'Set Answer Time'
                                      : 'Set Stop Time'}
                                </label>
                                <div className="col-md-9">
                                  <DatePicker
                                      showTimeInput
                                      dateFormat="Pp"
                                      selected={this.state.endTime}
                                      onChange={(date) => this.setState({ endTime: date })}
                                  />
                                </div>
                              </div>
                            </>
                        )}
                      </form>
                    </div>

                    <div className="tab-pane" id="second">
                      <div className="form-group row mb-3">
                        <label className="col-md-3 col-form-label" htmlFor="name3">
                          {' '}
                          Select Prediction
                        </label>
                        <div className="col-md-9">
                          <select
                              className="form-control"
                              name="question_select"
                              id="question_select"
                              value={this.state.question_select}
                              onChange={this.handleChange}
                          >
                            <option />
                            {this.state.questionsList.map((item, index) => {
                              return (
                                  <option value={item.key} key={index}>
                                    {item.questionText}
                                  </option>
                              );
                            })}
                          </select>
                        </div>
                      </div>
                      <div className="form-group mb-3">
                        <ol style={{ listStylePosition: 'inside', textAlign: 'left' }} className="offset-md-0 col-md-10">
                          {this.state.questionsAdded.map((item, index) => {
                            return (
                                <div key={index} className="form-group">
                                  <li>
                                    {item.questionText}{' '}
                                    <span style={{ float: 'right' }} className="fa fa-trash-o" onClick={() => this.removeFromToQuestionAddArray(index)}/>
                                  </li>
                                </div>
                            );
                          })}
                        </ol>
                      </div>
                      <div className="form-group row mb-3" align="center">
                        <div className="col-md-12">
                          <button className="btn btn-primary btn-admin" onClick={() => this.addQuestionToLocalArray()}>
                            Add Prediction
                          </button>
                        </div>
                      </div>
                    </div>

                    <div className="tab-pane fade" id="third">
                      <div className="form-horizontal">
                        <div className="row">
                          <div className="col-12" style={{ textAlign: 'center' }}>
                            <div className="form-check">
                              <input
                                  value={this.state.noPrizes}
                                  className="form-check-input"
                                  id="noPrizes"
                                  name="noPrizes"
                                  type="checkbox"
                                  checked={this.state.noPrizes}
                                  onChange={this.handleChange}
                              />
                              <label className="form-check-label" htmlFor="codes">
                                No Prizes
                              </label>
                            </div>
                          </div>
                        </div>
                        <div className="row">
                          <div className="col-12">
                            <Accordion style={{ margin: 10 }}>
                              {[
                                // We'll do i from -1 up to questionsAdded.length - 1 in the original code,
                                // but here let's replicate your original approach carefully:
                                ...Array(this.state.questionsAdded.length + 1).keys(),
                              ].map((i) => {
                                // i is the number correct
                                let winningHeader = 'You win!';
                                let winningMessage = 'Check your email for your prize!';
                                let winningMissedHeader = 'Nice Job!';
                                let winningMissedMessage = `You got ${i} correct! Unfortunately you didn't win a prize but try again soon!`;
                                let losingHeader = 'Oh No!';
                                let losingMessage = 'Nice try but no prize this time!  Try again soon!';
                                const tenantVars = this.state.tenantVariables;
                                if (i > 0) {
                                  winningMessage = `You got ${i} correct! Check your email for your prize!`;
                                }

                                if (this.state['winningWinnerHeader' + i] !== undefined) {
                                  winningHeader = this.state['winningWinnerHeader' + i];
                                } else if (
                                    tenantVars.defaultWinningHeader &&
                                    tenantVars.defaultWinningHeader.length > 0
                                ) {
                                  winningHeader = this.detectUseOfIndex(
                                      tenantVars.defaultWinningHeader,
                                      i
                                  );
                                }

                                if (this.state['winningWinnerMessage' + i] !== undefined) {
                                  winningMessage = this.state['winningWinnerMessage' + i];
                                } else if (
                                    tenantVars.defaultWinningMessage &&
                                    tenantVars.defaultWinningMessage.length > 0
                                ) {
                                  winningMessage = this.detectUseOfIndex(
                                      tenantVars.defaultWinningMessage,
                                      i
                                  );
                                }

                                if (this.state['winningMissedHeader' + i] !== undefined) {
                                  winningMissedHeader = this.state['winningMissedHeader' + i];
                                } else if (
                                    tenantVars.defaultWinningMissHeader &&
                                    tenantVars.defaultWinningMissHeader.length > 0
                                ) {
                                  winningMissedHeader = this.detectUseOfIndex(
                                      tenantVars.defaultWinningMissHeader,
                                      i
                                  );
                                }

                                if (this.state['winningMissedMessage' + i] !== undefined) {
                                  winningMissedMessage = this.state['winningMissedMessage' + i];
                                } else if (
                                    tenantVars.defaultWinningMissMessage &&
                                    tenantVars.defaultWinningMissMessage.length > 0
                                ) {
                                  winningMissedMessage = this.detectUseOfIndex(
                                      tenantVars.defaultWinningMissMessage,
                                      i
                                  );
                                }

                                if (this.state['losingHeader' + i] !== undefined) {
                                  losingHeader = this.state['losingHeader' + i];
                                } else if (
                                    tenantVars.defaultLosingHeader &&
                                    tenantVars.defaultLosingHeader.length > 0
                                ) {
                                  losingHeader = tenantVars.defaultLosingHeader;
                                }

                                if (this.state['losingMessage' + i] !== undefined) {
                                  losingMessage = this.state['losingMessage' + i];
                                } else if (
                                    tenantVars.defaultLosingMessage &&
                                    tenantVars.defaultLosingMessage.length > 0
                                ) {
                                  losingMessage = tenantVars.defaultLosingMessage;
                                }

                                return (
                                    <AccordionItem
                                        key={i}
                                        className="if-number-correct-item"
                                        title={`If a fan answers ${i} correct`}
                                        expanded={i === 0}
                                    >
                                      {!this.state.noPrizes && (
                                          <span>
                                      <div className="form-group row mb-3">
                                        <label
                                            className="col-md-3 col-form-label"
                                            htmlFor={`ticket_select${i}`}
                                        >
                                          {' '}
                                          Select Prize
                                        </label>
                                        <div className="col-md-6">
                                          <select
                                              className="form-control"
                                              name={`ticket_select${i}`}
                                              id={`ticket_select${i}`}
                                              value={this.state['ticket_select' + i] || ''}
                                              onChange={this.handleChange}
                                          >
                                            <option />
                                            {this.state.ticketList.map((item, index2) => (
                                                <option value={item.key} key={index2}>
                                                  {item.rewardName}
                                                </option>
                                            ))}
                                          </select>
                                        </div>
                                        <div
                                            className="col-md-3"
                                            style={{ alignSelf: 'center', textAlign: 'right' }}
                                        >
                                          <div className="form-check">
                                            <input
                                                id={`allElsePrize${i}`}
                                                className="form-check-input"
                                                name={`allElsePrize${i}`}
                                                type="checkbox"
                                                checked={this.state[`allElsePrize${i}`] || i === 0}
                                                onChange={this.handleChange}
                                            />
                                            <label className="form-check-label" htmlFor={`allElsePrize${i}`}>
                                              All Else Prize
                                            </label>
                                          </div>
                                        </div>
                                      </div>

                                      <div className="form-group row mb-3" style={{display: i > 0 && !this.state[`allElsePrize${i}`] ? 'flex' : 'none', alignItems: 'center'}}>
                                        <label className="col-md-3 col-form-label" htmlFor={`rewardAmount${i}`}>
                                          {' '}
                                          How Many Of This Prize To Give Out?
                                        </label>
                                        <div className="col-md-4">
                                          <input
                                              id={`rewardAmount${i}`}
                                              name={`rewardAmount${i}`}
                                              type="number"
                                              className="form-control"
                                              value={this.state[`rewardAmount${i}`] || ''}
                                              onChange={this.handleChange}
                                              placeholder="5"
                                          />
                                        </div>
                                        <div className="form-check" style={{ marginLeft: 5 }}>
                                          <input
                                              id={`codes${i}`}
                                              className="form-check-input"
                                              name={`codes${i}`}
                                              type="checkbox"
                                              checked={this.state[`codes${i}`] || false}
                                              onChange={this.handleChange}
                                          />
                                          <label className="form-check-label" htmlFor={`codes${i}`}>
                                            Add Codes
                                          </label>
                                        </div>
                                        <div className="form-check" style={{ marginLeft: 5 }}>
                                          <input
                                              id={`links${i}`}
                                              className="form-check-input"
                                              name={`links${i}`}
                                              type="checkbox"
                                              checked={this.state[`links${i}`] || false}
                                              onChange={this.handleChange}
                                          />
                                          <label className="form-check-label" htmlFor={`links${i}`}>
                                            Add Links
                                          </label>
                                        </div>
                                      </div>
                                      <div className="form-group row mb-3" style={{display: this.state[`codes${i}`] && !this.state[`allElsePrize${i}`] ? 'flex' : 'none'}}>
                                        <label htmlFor={`codesArray${i}`} className="col-md-3 col-form-label">
                                          Enter Codes (code1,code2)
                                        </label>
                                        <div className="col-md-9">
                                          <textarea
                                              value={this.state[`codesArray${i}`] || ''}
                                              className="form-control"
                                              name={`codesArray${i}`}
                                              onChange={this.handleChange}
                                              placeholder="code1,code2,code3"
                                          />
                                        </div>
                                      </div>
                                            <div className="form-group row mb-3" style={{display: this.state[`codes${i}`] && !this.state[`allElsePrize${i}`] ? 'flex' : 'none'}}>
                                        <label
                                            htmlFor={`pinsArray${i}`}
                                            className="col-md-3 col-form-label"
                                        >
                                          Enter Pins
                                        </label>
                                        <div className="col-md-9">
                                          <textarea
                                              value={this.state[`pinsArray${i}`] || ''}
                                              className="form-control"
                                              name={`pinsArray${i}`}
                                              onChange={this.handleChange}
                                              placeholder="pin1,pin2,pin3"
                                          />
                                        </div>
                                      </div>

                                            {/* Links input */}
                                            <div
                                                className="form-group row mb-3"
                                                style={{
                                                  display:
                                                      this.state[`links${i}`] &&
                                                      !this.state[`allElsePrize${i}`]
                                                          ? 'flex'
                                                          : 'none',
                                                }}
                                            >
                                        <label
                                            htmlFor={`linksArray${i}`}
                                            className="col-md-3 col-form-label"
                                        >
                                          Enter links
                                        </label>
                                        <div className="col-md-9">
                                          <textarea
                                              value={this.state[`linksArray${i}`] || ''}
                                              className="form-control"
                                              name={`linksArray${i}`}
                                              onChange={this.handleChange}
                                              placeholder="https://myfirstlink.com, https://mysecondlink.com, https://mythirdlink.com"
                                          />
                                        </div>
                                      </div>

                                      <div className="form-group row mb-3" align="center">
                                        <div className="col-md-12">
                                          <button
                                              className="btn btn-primary btn-admin"
                                              onClick={() => this.addRewardToLocalArray(i)}
                                          >
                                            Add Reward
                                          </button>
                                        </div>
                                      </div>

                                            {/* Random Order */}
                                            {this.state[`rewardsAdded${i}`] &&
                                                this.state[`rewardsAdded${i}`].length > 1 && (
                                                    <div className="form-check">
                                                      <input
                                                          value={this.state[`randomOrder${i}`] || false}
                                                          className="form-check-input"
                                                          id={`randomOrder${i}`}
                                                          name={`randomOrder${i}`}
                                                          type="checkbox"
                                                          checked={this.state[`randomOrder${i}`] || false}
                                                          onChange={this.handleChange}
                                                      />
                                                      <label
                                                          className="form-check-label"
                                                          htmlFor={`randomOrder${i}`}
                                                      >
                                                        Give Out In Random Order
                                                      </label>
                                                    </div>
                                                )}
                                            <div className="form-group mb-3">
                                        <ol
                                            style={{ listStylePosition: 'inside', textAlign: 'left' }}
                                            className="offset-md-0 col-md-10"
                                        >
                                          {(this.state[`rewardsAdded${i}`] || []).map(
                                              (item, addedIndex) => {
                                                let codesText = item.codes ? 'Yes' : 'No';
                                                return (
                                                    <div key={addedIndex} className="form-group">
                                                      <li>
                                                        ) {item.amount || 'All Else Prize'} -{' '}
                                                        {item.reward.rewardName}
                                                        {item.amount && '; Codes: ' + codesText}{' '}
                                                        <span
                                                            style={{ float: 'right' }}
                                                            className="fa fa-trash-o"
                                                            onClick={() =>
                                                                vm.removeFromToAddArray(addedIndex, i)
                                                            }
                                                        />
                                                      </li>
                                                    </div>
                                                );
                                              }
                                          )}
                                        </ol>
                                      </div>
                                    </span>
                                      )}

                                      <div className="form-check">
                                        <input
                                            className="form-check-input"
                                            name={`textEditChanges${i}`}
                                            type="checkbox"
                                            checked={this.state[`textEditChanges${i}`] || false}
                                            onChange={this.handleChange}
                                        />
                                        <label className="form-check-label" htmlFor={`textEditChanges${i}`}>
                                          Advanced Text Changes
                                        </label>
                                      </div>

                                      {/* Additional text if advanced toggled */}
                                      <div
                                          className="form-group row mb-3"
                                          style={{
                                            display: this.state[`textEditChanges${i}`] && !this.state.noPrizes ? 'flex' : 'none',
                                            alignItems: 'center',
                                          }}
                                      >
                                        <label
                                            htmlFor={`winningWinnerHeader${i}`}
                                            className="col-md-3 col-form-label"
                                        >
                                          Winner Header
                                        </label>
                                        <div className="col-md-9">
                                          <input
                                              value={winningHeader}
                                              className="form-control"
                                              name={`winningWinnerHeader${i}`}
                                              type="text"
                                              onChange={this.handleChange}
                                          />
                                        </div>
                                      </div>
                                      <div
                                          className="form-group row mb-3"
                                          style={{
                                            display: this.state[`textEditChanges${i}`] && !this.state.noPrizes ? 'flex' : 'none',
                                            alignItems: 'center',
                                          }}
                                      >
                                        <label
                                            htmlFor={`winningWinnerMessage${i}`}
                                            className="col-md-3 col-form-label"
                                        >
                                          Winner Message
                                        </label>
                                        <div className="col-md-9">
                                          <input
                                              value={winningMessage}
                                              className="form-control"
                                              name={`winningWinnerMessage${i}`}
                                              type="text"
                                              onChange={this.handleChange}
                                          />
                                        </div>
                                      </div>
                                      <div
                                          className="form-group row mb-3"
                                          style={{
                                            display:
                                                this.state[`textEditChanges${i}`] && i > 0 ? 'flex' : 'none',
                                            alignItems: 'center',
                                          }}
                                      >
                                        <label
                                            htmlFor={`winningMissedHeader${i}`}
                                            className="col-md-3 col-form-label"
                                        >
                                          Winner But No Prize Header
                                        </label>
                                        <div className="col-md-9">
                                          <input
                                              value={winningMissedHeader}
                                              className="form-control"
                                              name={`winningMissedHeader${i}`}
                                              type="text"
                                              onChange={this.handleChange}
                                          />
                                        </div>
                                      </div>
                                      <div className="form-group row mb-3" style={{display: this.state[`textEditChanges${i}`] && i > 0 ? 'flex' : 'none', alignItems: 'center'}}>
                                        <label htmlFor={`winningMissedMessage${i}`} className="col-md-3 col-form-label">
                                          Winner But No Prize Message
                                        </label>
                                        <div className="col-md-9">
                                          <input
                                              value={winningMissedMessage}
                                              className="form-control"
                                              name={`winningMissedMessage${i}`}
                                              type="text"
                                              onChange={this.handleChange}
                                          />
                                        </div>
                                      </div>
                                      <div className="form-group row mb-3" style={{display: this.state[`textEditChanges${i}`] && i === 0 ? 'flex' : 'none', alignItems: 'center'}}>
                                        <label htmlFor={`losingHeader${i}`} className="col-md-3 col-form-label">
                                          None Correct Header
                                        </label>
                                        <div className="col-md-9">
                                          <input
                                              value={losingHeader}
                                              className="form-control"
                                              name={`losingHeader${i}`}
                                              type="text"
                                              onChange={this.handleChange}
                                          />
                                        </div>
                                      </div>
                                      <div
                                          className="form-group row mb-3"
                                          style={{
                                            display:
                                                this.state[`textEditChanges${i}`] && i === 0 ? 'flex' : 'none',
                                            alignItems: 'center',
                                          }}
                                      >
                                        <label
                                            htmlFor={`losingMessage${i}`}
                                            className="col-md-3 col-form-label"
                                        >
                                          None Correct Message
                                        </label>
                                        <div className="col-md-9">
                                          <input
                                              value={losingMessage}
                                              className="form-control"
                                              name={`losingMessage${i}`}
                                              type="text"
                                              onChange={this.handleChange}
                                          />
                                        </div>
                                      </div>
                                    </AccordionItem>
                                );
                              })}
                            </Accordion>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="tab-pane fade" id="fourth">
                      <form id="otherForm" className="form-horizontal" />
                      <div className="row">
                        <div className="col-12">
                          <div className="text-center">
                            <h2 className="mt-0">
                              <i className="mdi mdi-check-all" />
                            </h2>
                            <h3 className="mt-0">Finish</h3>

                            <div className="row form-group">
                              <div className="col-md-12">
                                <div className="form-check">
                                  <input
                                      id="editAnswers"
                                      className="form-check-input"
                                      name="editAnswers"
                                      type="checkbox"
                                      checked={this.state.editAnswers}
                                      onChange={this.handleChange}
                                  />
                                  <label className="form-check-label" htmlFor="editAnswers">
                                    Allow fans to edit their answers
                                  </label>
                                </div>
                              </div>
                            </div>

                            <div className="row form-group">
                              <div className="col-md-12">
                                <p>
                                  You are all set to create a game! Before clicking "Create Game"
                                  make sure all the settings are correct. You can go back and edit
                                  anything!
                                </p>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    <ul className="list-inline wizard mb-0">
                      <li className="previous list-inline-item" style={{display: this.state.wizardLocation === 'first' ? 'none' : '' }}><a href="#" className="btn btn-primary btn-lg previous-wizard-button" onClick={() => this.navButtonClicked('prev')}>Previous</a></li>
                      <li className="next list-inline-item float-end"><a href="#" className="btn btn-primary btn-lg next-wizard-button" onClick={() => this.navButtonClicked('next')} style={{display: this.state.wizardLocation === 'fourth' ? 'none' : '' }}>Next</a></li>
                      <li className="next list-inline-item float-end"><a href="#" className="btn btn-primary btn-lg creategame-wizard-button" onClick={() => this.createGame()} style={{display: this.state.wizardLocation === 'fourth' ? '' : 'none' }}>Create Game</a></li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          </Modal>
          <Modal
              isOpen={this.state.predictionsAnsweredModal}
              toggle={this.togglePredictionsAnsweredModal}
              style={{ width: '90%' }}
              id="myModal2"
          >
            <div className="card">
              <div className="card-body">
                <h4 className="header-title mb-3"> Predictions To Answer</h4>
                <Carousel
                    style={{ backgroundColor: 'white' }}
                    showArrows={true}
                    showStatus={false}
                    showIndicators={false}
                    showThumbs={false}
                    selectedItem={this.state.selectedAnswerItem}
                    onChange={(e) => {
                      this.setState({ selectedAnswerItem: e });
                    }}
                >
                  {selectedGameQuestions.map((item, i) => (
                      <div style={{ backgroundColor: '#FAFBFE', padding: 10 }} key={i}>
                        <p style={{ color: 'black' }}>
                          {i + 1}/{selectedGameQuestions.length}
                        </p>
                        <p style={{ color: 'black' }}>{item.questionText}</p>
                        <ol style={{ textAlign: 'left' }}>
                          {item.answers.map((answer, j) => {
                            if (answer.correct) {
                              return (
                                  <li style={{ color: 'black', backgroundColor: 'green' }} key={j}>
                                    {answer.answerText}
                                  </li>
                              );
                            }
                            return (
                                <li key={j}>
                                  {answer.answerText}
                                  <button
                                      className="btn btn-success"
                                      style={{ marginLeft: 5 }}
                                      onClick={() => this.setAnswerCorrect(answer.id, item.id)}
                                  >
                                    MARK AS CORRECT
                                  </button>
                                </li>
                            );
                          })}
                        </ol>
                        {allPredictionsAnswered && (
                            <div>
                              <p>All Predictions Answered</p>
                              <button className="btn btn-primary" onClick={() => this.calculateWinners()}>
                                Send Prizes
                              </button>
                            </div>
                        )}
                      </div>
                  ))}
                </Carousel>
              </div>
            </div>
          </Modal>
        </div>
    );
  }
}

export default SetUpGame;
