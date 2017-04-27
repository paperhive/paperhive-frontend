import about from './about';
import activity from './activity';
import attribution from './attribution';
import authReturn from './auth-return';
import avatar from './avatar';
import avatarList from './avatar-list';
import channel from './channel';
import channelBookmark from './channel-bookmark';
import channelBookmarksList from './channel-bookmarks-list';
import channelInvitationConfirm from './channel-invitation-confirm';
import channelInvitationLink from './channel-invitation-link';
import channelInvitationLinkConfirm from './channel-invitation-link-confirm';
import channelInvitationNew from './channel-invitation-new';
import channelInvitations from './channel-invitations';
import channelMemberUpdate from './channel-member-update';
import channelMembers from './channel-members';
import channelNew from './channel-new';
import channelSelector from './channel-selector';
import channelSettings from './channel-settings';
import channels from './channels';
import channelsInvitations from './channels-invitations';
import channelsList from './channels-list';
import comment from './comment';
import contact from './contact';
import discussionList from './discussion-list';
import discussionShareIcon from './discussion-share-icon';
import discussionThreadView from './discussion-thread-view';
import document from './document';
import documentInfoKudos from './document-info-kudos';
import documentItem from './document-item';
import documentNew from './document-new';
import documentRemote from './document-remote';
import documentSidenav from './document-sidenav';
import documentSidenavOutlineItem from './document-sidenav-outline-item';
import documentSidenavPagination from './document-sidenav-pagination';
import documentSidenavSearch from './document-sidenav-search';
import documentText from './document-text';
import documentsList from './documents-list';
import dropdownSelect from './dropdown-select';
import extensionButtons from './extension-buttons';
import feedback from './feedback';
import feedbackButton from './feedback-button';
import filterButton from './filter-button';
import helpMarkdown from './help-markdown';
import hiveButton from './hive-button';
import hivedDocs from './hived-docs';
import hivers from './hivers';
import inlineEditable from './inline-editable';
import jobs from './jobs';
import legalNotice from './legal-notice';
import login from './login';
import mainPage from './main-page';
import margin from './margin';
import marginCluster from './margin-cluster';
import marginClusterPane from './margin-cluster-pane';
import marginClusterPlaceholder from './margin-cluster-placeholder';
import marginDiscussion from './margin-discussion';
import marginDiscussionEdit from './margin-discussion-edit';
import marginDraftPane from './margin-draft-pane';
import marginLink from './margin-link';
import marginReply from './margin-reply';
import marginReplyEdit from './margin-reply-edit';
import navbar from './navbar';
import navbarSearch from './navbar-search';
import navbarUser from './navbar-user';
import newReply from './new-reply';
import notFound from './not-found';
import notifications from './notifications';
import officeMap from './office-map';
import onboarding from './onboarding';
import onboardingBookmark from './onboarding-bookmark';
import onboardingChannel from './onboarding-channel';
import onboardingProfile from './onboarding-profile';
import partnerLogos from './partner-logos';
import passwordRequest from './password-request';
import passwordReset from './password-reset';
import pdf from './pdf';
import pdfHighlight from './pdf-highlight';
import pdfPopup from './pdf-popup';
import pdfSelectionPopup from './pdf-selection-popup';
import phFooter from './ph-footer';
import publishers from './publishers';
import search from './search';
import searchDate from './search-date';
import searchDateDropdown from './search-date-dropdown';
import searchDonut from './search-donut';
import searchDropdown from './search-dropdown';
import settings from './settings';
import settingsAccounts from './settings-accounts';
import settingsEmail from './settings-email';
import settingsProfile from './settings-profile';
import signup from './signup';
import subscribe from './subscribe';
import subscribed from './subscribed';
import supporterLogos from './supporter-logos';
import terms from './terms';
import urlShare from './url-share';
import user from './user';
import userProfile from './user-profile';

export default function(app) {
  about(app);
  activity(app);
  attribution(app);
  authReturn(app);
  avatar(app);
  avatarList(app);
  channel(app);
  channelBookmark(app);
  channelBookmarksList(app);
  channelInvitationConfirm(app);
  channelInvitationLink(app);
  channelInvitationLinkConfirm(app);
  channelInvitationNew(app);
  channelInvitations(app);
  channelMembers(app);
  channelMemberUpdate(app);
  channelSelector(app);
  channelSettings(app);
  channels(app);
  channelsInvitations(app);
  channelsList(app);
  channelNew(app);
  comment(app);
  contact(app);
  discussionList(app);
  discussionShareIcon(app);
  discussionThreadView(app);
  document(app);
  documentInfoKudos(app);
  documentItem(app);
  documentNew(app);
  documentRemote(app);
  documentSidenav(app);
  documentSidenavOutlineItem(app);
  documentSidenavPagination(app);
  documentSidenavSearch(app);
  documentText(app);
  documentsList(app);
  dropdownSelect(app);
  extensionButtons(app);
  feedback(app);
  feedbackButton(app);
  filterButton(app);
  helpMarkdown(app);
  hiveButton(app);
  hivedDocs(app);
  hivers(app);
  jobs(app);
  inlineEditable(app);
  legalNotice(app);
  login(app);
  mainPage(app);
  margin(app);
  marginCluster(app);
  marginClusterPane(app);
  marginClusterPlaceholder(app);
  marginDiscussion(app);
  marginDiscussionEdit(app);
  marginDraftPane(app);
  marginLink(app);
  marginReply(app);
  marginReplyEdit(app);
  navbar(app);
  navbarSearch(app);
  navbarUser(app);
  newReply(app);
  notFound(app);
  notifications(app);
  officeMap(app);
  onboarding(app);
  onboardingBookmark(app);
  onboardingChannel(app);
  onboardingProfile(app);
  partnerLogos(app);
  passwordRequest(app);
  passwordReset(app);
  pdf(app);
  pdfHighlight(app);
  pdfPopup(app);
  pdfSelectionPopup(app);
  phFooter(app);
  publishers(app);
  search(app);
  searchDate(app);
  searchDateDropdown(app);
  searchDonut(app);
  searchDropdown(app);
  settings(app);
  settingsAccounts(app);
  settingsEmail(app);
  settingsProfile(app);
  signup(app);
  subscribe(app);
  subscribed(app);
  supporterLogos(app);
  terms(app);
  urlShare(app);
  user(app);
  userProfile(app);
};
