import * as fs from 'fs';
import { InternalServerErrorException } from '@nestjs/common';

export function transformReturnObject<T>(
  values: T[],
  countBeforeLimit?: number,
  page?: number,
  startIndex?: number,
  endIndex?: number,
  limit?: number,
) {
  const pagination = {
    ...(startIndex > 0 && {
      prev: {
        page: page - 1,
        limit,
      },
    }),
    ...(endIndex < countBeforeLimit && {
      next: {
        page: page + 1,
        limit,
      },
    }),
  };
  return {
    success: true,
    count: countBeforeLimit,
    startIndex,
    pagination,
    data: values,
  };
}

export async function deleteFileorFolder(path) {
  try {
    if (path) {
      const value = await fileOrPathExists(path);
      if (value) {
        // console.log('exists: ', path);
        fs.rm(path, { recursive: true }, (err) => {
          if (err) console.log(err.message);
          else {
            // console.log(path, ' deleted');
          }
        });
      } else {
        throw new InternalServerErrorException();
      }
    } else {
      throw new InternalServerErrorException('Path not specified');
    }
  } catch (e) {
    console.log(e);
  }
}

export function fileOrPathExists(path: string): Promise<boolean> {
  return new Promise((resolve) => {
    if (!path) {
      resolve(false);
    }
    fs.access(path, fs.constants.F_OK, (err) => {
      if (err) {
        resolve(false);
      }
      resolve(true);
    });
  });
}

export function fileSizeMb(path: string): Promise<number | undefined> {
  return new Promise((resolve) => {
    fs.stat(path, (err, stat) => {
      if (err) {
        resolve(undefined);
      }
      const mb = stat.size / (1024 * 1024);
      resolve(mb);
    });
  });
}
