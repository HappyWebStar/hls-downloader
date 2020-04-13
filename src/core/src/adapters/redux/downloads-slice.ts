import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import { ActionType } from "typesafe-actions";
import { Fragment, Playlist, PlaylistStatus } from "../../entities";

export interface IDownloadsState {
  playlists: Record<string, Playlist>;
  playlistsStatus: Record<string, PlaylistStatus>;
}
export interface IFetchPlaylistFragmentsDetailsPayload {
  playlistID: string;
  fragments: Fragment[];
}
export interface IDownloadPlaylistPayload {
  playlist: Playlist;
}
export interface IFinishDownloadPayload {
  playlistID: string;
}
export interface IIncStatusPayload {
  playlistID: string;
}

const initialDownloadsState: IDownloadsState = {
  playlistsStatus: {},
  playlists: {},
};

export const downloadsSlice = createSlice({
  name: "downloads",
  initialState: initialDownloadsState,
  reducers: {
    downloadPlaylist(state, action: PayloadAction<IDownloadPlaylistPayload>) {
      const { playlist } = action.payload;

      state.playlists[playlist.id] = playlist;
    },
    fetchPlaylistFragmentsDetails(
      state,
      action: PayloadAction<IFetchPlaylistFragmentsDetailsPayload>
    ) {
      const { playlistID, fragments } = action.payload;

      state.playlistsStatus[playlistID] = {
        done: 0,
        total: fragments.length,
        status: "init",
      };
    },
    finishDownload(state, action: PayloadAction<IFinishDownloadPayload>) {
      const { playlistID } = action.payload;
      const playlistStatus = state.playlistsStatus[playlistID];

      playlistStatus.done = playlistStatus.total;
      playlistStatus.status = "merging";
    },
    incDownloadStatus(state, action: PayloadAction<IIncStatusPayload>) {
      const { playlistID } = action.payload;
      const playlistStatus = state.playlistsStatus[playlistID];
      
      playlistStatus.status = "downloading";
      playlistStatus.done++;
    },
    saveDownload() {},
  },
});

export type DownloadAction = ActionType<typeof downloadsSlice.actions>;