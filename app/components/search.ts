import { copy } from 'angular';
import { assign, clone, forEach, isArray, isEqual } from 'lodash';

interface IDateFilterOptions {
  apiParameters: {
    from: string;
    to: string;
  };
  urlParameters: {
    mode: string;
    from: string;
    to: string;
  };
  onUpdate(): void;
}

interface IDateFilterData {
  mode: string;
  from: string;
  to: string;
}

class DateFilter {
  mode: string;
  from: Date;
  to: Date;

  constructor(public options: IDateFilterOptions) {}

  // round to beginning of day
  static getDay(date) {
    const newDate = new Date(date);
    newDate.setUTCHours(0);
    newDate.setUTCMinutes(0);
    newDate.setUTCSeconds(0);
    newDate.setUTCMilliseconds(0);
    return newDate;
  }

  update(data: IDateFilterData) {
    const currentData = {mode: this.mode, from: this.from, to: this.to};
    const newData = {mode: undefined, from: undefined, to: undefined};

    // sanitize data
    switch (data.mode) {
      case undefined: break;
      case 'custom': {
        if (!data.from && !data.to) throw new Error('from or to required');
        newData.mode = 'custom';
        newData.from = data.from && parseValue(data.from, 'date');
        newData.to = data.to && parseValue(data.to, 'date');
        break;
      }
      case 'lastYear': {
        newData.mode = 'lastYear';
        if (currentData.mode === 'lastYear') {
          newData.from = currentData.from;
          break;
        }
        const date = new Date();
        date.setUTCFullYear(date.getUTCFullYear() - 1);
        newData.from = DateFilter.getDay(date);
        break;
      }
      case 'lastMonth': {
        newData.mode = 'lastMonth';
        if (currentData.mode === 'lastMonth') {
          newData.from = currentData.from;
          break;
        }
        const date = new Date();
        date.setUTCMonth(date.getUTCMonth() - 1);
        newData.from = DateFilter.getDay(date);
        break;
      }
      case 'lastWeek': {
        newData.mode = 'lastWeek';
        if (currentData.mode === 'lastWeek') {
          newData.from = currentData.from;
          break;
        }
        const date = new Date();
        date.setUTCDate(date.getUTCDate() - 7);
        newData.from = DateFilter.getDay(date);
        break;
      }
      default:
        throw new Error(`date mode ${data.mode} unknown`);
    }

    if (isEqual(currentData, newData)) return;
    assign(this, newData);
    this.options.onUpdate();
  }

  updateFromUrlQuery(query) {
    this.update({
      mode: query[this.options.urlParameters.mode],
      from: query[this.options.urlParameters.from],
      to: query[this.options.urlParameters.to],
    });
  }

  getUrlQuery() {
    return {
      [this.options.urlParameters.mode]: this.mode,
      [this.options.urlParameters.from]: this.mode === 'custom' && this.from
        ? this.from.toISOString() : undefined,
      [this.options.urlParameters.to]: this.mode === 'custom' && this.to
        ? this.to.toISOString() : undefined,
    };
  }

  getApiQuery() {
    return {
      [this.options.apiParameters.from]: this.from,
      [this.options.apiParameters.to]: this.to,
    };
  }
}

function parseValue(value: string, type: string) {
  switch (type) {
    case 'string': return value;
    case 'boolean':
      if (value === 'true') return true;
      if (value === 'false') return false;
      throw new Error('not true or false');
    case 'integer': {
      const integer = parseInt(value, 10);
      if (isNaN(integer)) throw new Error('is not an integer');
      return integer;
    }
    case 'number': {
      const num = parseFloat(value);
      if (isNaN(num)) throw new Error('is not a number');
      return num;
    }
    case 'date': {
      const milliseconds = Date.parse(value);
      if (!milliseconds) throw new Error('is not an ISO8601 date');
      return new Date(milliseconds);
    }
    default: throw new Error(`type ${this.options.type} not recognized`);
  }
}

interface ITermsFilterOptions {
  type: string;
  apiParameters: {
    term: string;
    missing: string;
  };
  urlParameters: {
    term: string;
    missing: string;
  };
  onUpdate(): void;
}

class TermsFilter<T> {
  private terms: T[] = [];

  constructor(public options: ITermsFilterOptions) {}

  add(term: T) {
    this.terms.push(term);
    this.options.onUpdate();
  }

  remove(term: T) {
    this.terms.splice(this.terms.indexOf(term), 1);
    this.options.onUpdate();
  }

  reset() {
    this.terms.splice(0, this.terms.length);
    this.options.onUpdate();
  }

  isActive() {
    return this.terms.length > 0;
  }

  getApiQuery() {
    const terms = this.terms.filter(term => term !== null);
    return {
      [this.options.apiParameters.term]: terms.length > 0 ? terms : undefined,
      [this.options.apiParameters.missing]: this.terms.indexOf(null) !== -1
        ? true : undefined,
    };
  }

  getUrlQuery() {
    const result = {};
    const terms = this.terms
      .filter(term => term !== null)
      .map(term => term === null ? null : term.toString());
    if (terms.length > 0) result[this.options.urlParameters.term] = terms;
    if (this.terms.indexOf(null) !== -1) result[this.options.urlParameters.missing] = 'true';
    return result;
  }

  updateFromUrlQuery(query) {
    const urlTerms = query[this.options.urlParameters.term] as string[];
    const newTerms = [];
    if (isArray(urlTerms)) {
      urlTerms.forEach(term => newTerms.push(parseValue(term, this.options.type)));
    } else if (urlTerms !== undefined) {
      newTerms.push(parseValue(urlTerms, this.options.type));
    }

    const missing = query[this.options.urlParameters.missing] as string;
    if (missing !== undefined && parseValue(missing, 'boolean')) {
      newTerms.push(null);
    }

    if (!isEqual(newTerms, this.terms)) {
      copy(newTerms, this.terms);
      this.options.onUpdate();
    }
  }
}

// André: subclassing Array is still a pain in the ass in JS
//        -> use items property
class FilterArray {
  items = [];

  add(item) {
    if (this.items.indexOf(item) !== -1) return;
    this.items.push(item);
  }

  isEmpty() {
    return this.items.length === 0;
  }

  remove(item) {
    this.items.splice(this.items.indexOf(item), 1);
  }

  replace(items) {
    this.reset();
    items.forEach(item => this.items.push(item));
  }

  reset() {
    this.items.splice(0, this.items.length);
  }

  setFromQuery(val) {
    let array = val || [];
    // if param is just a single value (i.e. parameter is provided once) then
    // we need to turn the string into an array
    if (!isArray(array)) {
      array = [array];
    }
    array = clone(array).sort();
    if (isEqual(array, this.items)) return;

    this.replace(array);
  }
}

export default function(app) {
  app.component('search', {
    controller: class SearchCtrl {
      const maxPerPage = 10;
      page = 1;
      query: string;
      queryModel: string;
      filters: any;
      params: any = {};

      resultsTotal: number;
      results: any[];
      filterResults = {};
      total: number;
      updatingResults: boolean;
      updatingTotal: boolean;

      static $inject = ['config', '$http', '$location', '$scope',
        'feedbackModal', 'notificationService'];

      constructor(public config, public $http, public $location, $scope,
                  public feedbackModal, public notificationService) {
        $scope.$on('$locationChangeSuccess', this.updateFromLocation.bind(this));

        $scope.$watchGroup(
          ['$ctrl.query', '$ctrl.page'],
          (newVals, oldVals) => newVals !== oldVals && this.updateParams(),
        );

        this.filters = {
          access: new TermsFilter({
            onUpdate: this.updateParams.bind(this),
            type: 'boolean',
            apiParameters: {term: 'openAccess', missing: 'openAccessMissing'},
            urlParameters: {term: 'access', missing: 'accessMissing'},
          }),
          documentType: new TermsFilter({
            onUpdate: this.updateParams.bind(this),
            type: 'string',
            apiParameters: {term: 'documentType', missing: 'documentTypeMissing'},
            urlParameters: {term: 'documentType', missing: 'documentTypeMissing'},
          }),
          journal: new TermsFilter({
            onUpdate: this.updateParams.bind(this),
            type: 'string',
            apiParameters: {term: 'journal', missing: 'journalMissing'},
            urlParameters: {term: 'journal', missing: 'journalMissing'},
          }),
          publishedAt: new DateFilter({
            onUpdate: this.updateParams.bind(this),
            apiParameters: {from: 'publishedAfter', to: 'publishedBefore'},
            urlParameters: {mode: 'publishedAtMode', from: 'publishedAtFrom', to: 'publishedBefore'},
          }),
        };

        this.updateFromLocation();
        this.updateTotal();

        $scope.$watchCollection('$ctrl.params', this.updateResults.bind(this));
      }

      scrollToTop() {
        window.scrollTo(0, 0);
      }

      submitQuery() {
        this.query = this.queryModel;
      }

      // update controller variables from location
      updateFromLocation() {
        const search = this.$location.search();
        this.query = search.query;
        this.page = search.page || 1;

        forEach(this.filters, filter => filter.updateFromUrlQuery(search));

        this.queryModel = this.query;
      }

      // update location from controller
      updateLocation() {
        const search = {
          query: this.query,
          page: this.page > 1 ? this.page : undefined,
        };
        forEach(this.filters, filter => assign(search, filter.getUrlQuery()));
        this.$location.search(search);
      }

      updateParams() {
        const params = {
          q: this.query,
          limit: this.maxPerPage,
          skip: (this.page - 1) * this.maxPerPage,
          restrictToLatest: true,
        };

        // TODO: loop
        forEach(this.filters, filter => assign(params, filter.getApiQuery()));

        if (isEqual(params, this.params)) return;
        copy(params, this.params);
      }

      updateResults(params) {
        this.updateLocation();

        this.resultsTotal = undefined;
        this.results = undefined;
        this.updatingResults = true;

        return this.$http.get(`${this.config.apiUrl}/documents/search`, {params})
        .then(
          response => {
            this.resultsTotal = response.data.total;
            this.results = response.data.documents;
            this.filterResults = response.data.filters;
          },
          response => this.notificationService.notifications.push({
            type: 'error',
            message: 'Could not fetch documents',
          }),
        )
        .finally(() => this.updatingResults = false);
      }

      updateTotal() {
        this.updatingTotal = true;
        return this.$http.get(`${this.config.apiUrl}/documents/search`, {
          restrictToLatest: true,
        }).then(
          response => this.total = response.data.total,
          response => this.notificationService.notifications.push({
            type: 'error',
            message: 'Could not fetch documents',
          }),
        ).finally(() => this.updatingTotal = false);
      }
    },
    template: require('./search.html'),
  });
};
