import { Epic } from "redux-observable";
import { from, of } from "rxjs";
import { filter, map, mergeMap } from "rxjs/operators";
import {
  DownloadAction,
  downloadsSlice,
} from "../adapters/redux/downloads-slice";
import { RootState } from "../adapters/redux/root-reducer";
import { Dependencies } from "../services";
import {
  createBucketFactory,
  downloadSingleFragmentFactory,
  getFragmentsDetailsFactory,
  mergeBucketFactory,
  writeToBucketFactory,
  writeToFileFactory,
} from "../use-cases";

export const fetchPlaylistFragmentsDetailsEpic: Epic<
  DownloadAction,
  DownloadAction,
  RootState,
  Dependencies
> = (action$, _store, { loader, parser, fs }) => {
  return action$.pipe(
    filter(downloadsSlice.actions.downloadPlaylist.match),
    map((action) => action.payload.playlist),
    mergeMap(
      (playlist) =>
        from(getFragmentsDetailsFactory(loader, parser)(playlist)).pipe(),
      (playlist, fragments) => ({
        fragments,
        playlist,
      })
    ),
    mergeMap(({ fragments, playlist }) =>
      of(
        downloadsSlice.actions.fetchPlaylistFragmentsDetails({
          fragments: fragments,
          playlistID: playlist.id,
        })
      )
    )
  );
};

export const downloadPlaylistFragmentsEpic: Epic<
  DownloadAction,
  DownloadAction,
  RootState,
  Dependencies
> = (action$, _store, { fs, loader, config }) => {
  return action$.pipe(
    filter(downloadsSlice.actions.fetchPlaylistFragmentsDetails.match),
    map((action) => action.payload),
    mergeMap(
      ({ fragments, playlistID }) =>
        from(createBucketFactory(fs)(playlistID, fragments.length)),
      ({ fragments, playlistID }) => ({
        fragments,
        playlistID,
      })
    ),
    mergeMap(({ fragments, playlistID }) =>
      from(fragments).pipe(
        mergeMap(
          (fragment) => from(downloadSingleFragmentFactory(loader)(fragment)),
          (fragment, data) => ({
            fragment,
            data,
            playlistID,
          }),
          config.concurrency
        )
      )
    ),
    mergeMap(
      ({ data, playlistID, fragment }) =>
        writeToBucketFactory(fs)(playlistID, fragment.index, data),
      ({ playlistID }) => ({
        playlistID,
      })
    ),
    mergeMap(({ playlistID }) =>
      of(
        downloadsSlice.actions.incDownloadStatus({
          playlistID,
        })
      )
    )
  );
};

export const incDownloadStatusEpic: Epic<
  DownloadAction,
  DownloadAction,
  RootState,
  Dependencies
> = (action$, store$) => {
  return action$.pipe(
    filter(downloadsSlice.actions.incDownloadStatus.match),
    map((action) => action.payload.playlistID),
    map((id) => ({ id, status: store$.value.downloads.playlistsStatus[id] })),
    filter(({ status }) => status.done === status.total),
    mergeMap(({ id }) =>
      of(
        downloadsSlice.actions.finishDownload({
          playlistID: id,
        })
      )
    )
  );
};

export const finishPlaylistFragmentsEpic: Epic<
  DownloadAction,
  DownloadAction,
  RootState,
  Dependencies
> = (action$, _store$, { fs }) => {
  return action$.pipe(
    filter(downloadsSlice.actions.finishDownload.match),
    map((action) => action.payload.playlistID),
    mergeMap(
      (playlistID) => from(mergeBucketFactory(fs)(playlistID)),
      (playlistID, data) => ({ playlistID, data })
    ),
    mergeMap(({ playlistID, data }) =>
      from(writeToFileFactory(fs)(`${playlistID}.mp4`, data))
    ),
    mergeMap(() => of(downloadsSlice.actions.saveDownload()))
  );
};