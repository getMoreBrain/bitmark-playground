// @zen-component: PLAN-002-ApplicationInfo
import { useMemo } from 'react';

import { buildInfo } from '../generated/build-info';

import { useBitmarkParserGenerator } from './BitmarkParserGenerator';
import { useBitmarkParser } from './BitmarkParser';

const FIRST_PUBLISHED_YEAR = 2023;

export interface ApplicationInfo {
  name: string;
  version: string;
  author: string;
  license: string;
  description: string;
  copyright: string;
  bitmarkParserGeneratorVersion: string;
  bitmarkParserGeneratorLoadError: boolean;
  // @zen-impl: PLAN-002-Step8 (bp version in app info)
  bitmarkParserVersion: string;
  bitmarkParserLoadError: boolean;
}

const useApplicationInfo = (): ApplicationInfo => {
  const { bitmarkParserGenerator, loadError: bpgLoadError } = useBitmarkParserGenerator();
  const { version: bitmarkParserVersion, loadError: bpLoadError } = useBitmarkParser();

  const appInfo = useMemo<ApplicationInfo>(() => {
    let bitmarkParserGeneratorVersion = '';
    if (bitmarkParserGenerator) {
      bitmarkParserGeneratorVersion = bitmarkParserGenerator.version();
    }

    const thisYear = new Date().getFullYear();
    const copyrightYear =
      thisYear === FIRST_PUBLISHED_YEAR ? thisYear.toString() : `${FIRST_PUBLISHED_YEAR}-${thisYear}`;

    const copyright = `© ${copyrightYear} ${buildInfo.author}`;

    return {
      ...buildInfo,
      copyright,
      bitmarkParserGeneratorVersion,
      bitmarkParserGeneratorLoadError: bpgLoadError,
      bitmarkParserVersion,
      bitmarkParserLoadError: bpLoadError,
    };
  }, [bitmarkParserGenerator, bpgLoadError, bitmarkParserVersion, bpLoadError]);

  return appInfo;
};

export { useApplicationInfo };
