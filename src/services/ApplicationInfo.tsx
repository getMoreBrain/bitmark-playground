import { useMemo } from 'react';

import { buildInfo } from '../generated/build-info';

import { useBitmarkParserGenerator } from './BitmarkParserGenerator';

const FIRST_PUBLISHED_YEAR = 2023;

export interface ApplicationInfo {
  name: string;
  version: string;
  author: string;
  license: string;
  description: string;
  copyright: string;
  bitmarkParserGeneratorVersion: string;
}

const useApplicationInfo = (): ApplicationInfo => {
  const { bitmarkParserGenerator } = useBitmarkParserGenerator();

  const appInfo = useMemo<ApplicationInfo>(() => {
    let bitmarkParserGeneratorVersion = '';
    if (bitmarkParserGenerator) {
      bitmarkParserGeneratorVersion = bitmarkParserGenerator.version();
    }

    const thisYear = new Date().getFullYear();
    const copyrightYear =
      thisYear === FIRST_PUBLISHED_YEAR ? thisYear.toString() : `${FIRST_PUBLISHED_YEAR}-${thisYear}`;

    const copyright = `(c) ${copyrightYear} ${buildInfo.author}`;

    return {
      ...buildInfo,
      copyright,
      bitmarkParserGeneratorVersion,
    };
  }, [bitmarkParserGenerator]);

  return appInfo;
};

export { useApplicationInfo };
