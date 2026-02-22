import poster1 from "@/assets/show-poster-1.jpg";
import poster2 from "@/assets/show-poster-2.jpg";
import poster3 from "@/assets/show-poster-3.jpg";
import poster4 from "@/assets/show-poster-4.jpg";
import poster5 from "@/assets/show-poster-5.jpg";
import poster6 from "@/assets/show-poster-6.jpg";

export interface Episode {
  id: string;
  season: number;
  episode: number;
  title: string;
  airDate: string;
  watched: boolean;
}

export interface TVShow {
  id: string;
  title: string;
  genre: string;
  poster: string;
  status: "airing" | "ended" | "upcoming";
  network: string;
  tracked: boolean;
  episodes: Episode[];
}

export const initialShows: TVShow[] = [
  {
    id: "1",
    title: "Quantum Breach",
    genre: "Sci-Fi Thriller",
    poster: poster1,
    status: "airing",
    network: "HBO",
    tracked: false,
    episodes: [
      { id: "1-1", season: 2, episode: 1, title: "The Signal", airDate: "2026-02-15", watched: false },
      { id: "1-2", season: 2, episode: 2, title: "Echoes", airDate: "2026-02-22", watched: false },
      { id: "1-3", season: 2, episode: 3, title: "Fracture Point", airDate: "2026-03-01", watched: false },
      { id: "1-4", season: 2, episode: 4, title: "Convergence", airDate: "2026-03-08", watched: false },
    ],
  },
  {
    id: "2",
    title: "Noir City",
    genre: "Crime Drama",
    poster: poster2,
    status: "airing",
    network: "FX",
    tracked: false,
    episodes: [
      { id: "2-1", season: 1, episode: 5, title: "The Witness", airDate: "2026-02-18", watched: false },
      { id: "2-2", season: 1, episode: 6, title: "Dead Ends", airDate: "2026-02-25", watched: false },
      { id: "2-3", season: 1, episode: 7, title: "Shadow Play", airDate: "2026-03-04", watched: false },
    ],
  },
  {
    id: "3",
    title: "Throne of Embers",
    genre: "Fantasy",
    poster: poster3,
    status: "upcoming",
    network: "Netflix",
    tracked: false,
    episodes: [
      { id: "3-1", season: 1, episode: 1, title: "The Awakening", airDate: "2026-04-10", watched: false },
      { id: "3-2", season: 1, episode: 2, title: "Blood Oath", airDate: "2026-04-17", watched: false },
    ],
  },
  {
    id: "4",
    title: "Code Blue",
    genre: "Medical Drama",
    poster: poster4,
    status: "airing",
    network: "ABC",
    tracked: false,
    episodes: [
      { id: "4-1", season: 3, episode: 10, title: "Flatline", airDate: "2026-02-20", watched: false },
      { id: "4-2", season: 3, episode: 11, title: "Recovery", airDate: "2026-02-27", watched: false },
      { id: "4-3", season: 3, episode: 12, title: "Finale", airDate: "2026-03-06", watched: false },
    ],
  },
  {
    id: "5",
    title: "Good Neighbors",
    genre: "Comedy",
    poster: poster5,
    status: "airing",
    network: "NBC",
    tracked: false,
    episodes: [
      { id: "5-1", season: 2, episode: 8, title: "The BBQ", airDate: "2026-02-19", watched: false },
      { id: "5-2", season: 2, episode: 9, title: "Block Party", airDate: "2026-02-26", watched: false },
    ],
  },
  {
    id: "6",
    title: "The Hollow",
    genre: "Horror",
    poster: poster6,
    status: "ended",
    network: "AMC",
    tracked: false,
    episodes: [
      { id: "6-1", season: 2, episode: 8, title: "Into the Dark", airDate: "2026-01-15", watched: false },
      { id: "6-2", season: 2, episode: 9, title: "The Reckoning", airDate: "2026-01-22", watched: false },
      { id: "6-3", season: 2, episode: 10, title: "Series Finale", airDate: "2026-01-29", watched: false },
    ],
  },
];
