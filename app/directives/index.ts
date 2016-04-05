import affix from './affix';
import attributes from './attributes';
import attribution from './attribution';
import confirmedClick from './confirmed-click';
import elastic from './elastic';
import elementPosition from './elementPosition';
import elementSize from './elementSize';
import highlights from './highlights';
import kramjax from './kramjax';
import onOutside from './onOutside';
import onRendered from './onRendered';
import onTextSelect from './onTextSelect';
import pdf from './pdf';
import subnav from './subnav';
import toc from './toc';
import validateDocumentSource from './validateDocumentSource';
import validateUsername from './validate-username';
import viewportHeight from './viewportHeight';

export default function(app) {
  affix(app);
  attributes(app);
  attribution(app);
  confirmedClick(app);
  elastic(app);
  elementPosition(app);
  elementSize(app);
  highlights(app);
  kramjax(app);
  onOutside(app);
  onRendered(app);
  onTextSelect(app);
  pdf(app);
  subnav(app);
  toc(app);
  validateDocumentSource(app);
  validateUsername(app);
  viewportHeight(app);
};
