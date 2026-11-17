// Parser registry: config "module" name -> parser module. Each module exports parse(html, { domain, target }) and
// returns { raw_status, normalized_status, current_category, note }. A parser that throws only affects its own vendor.
import * as fortinet from './fortinet.mjs';
import * as symantec from './symantec.mjs';
import * as mcafee from './mcafee.mjs';

export const PARSERS = { fortinet, symantec, mcafee };
export const STATUSES = ['UNCATEGORIZED', 'PENDING', 'CATEGORIZED', 'BLOCKED', 'ERROR'];
