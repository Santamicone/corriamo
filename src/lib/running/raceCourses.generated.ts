/**
 * Catalogo dei percorsi di gara precaricati.
 *
 * ⚠ FILE GENERATO — non modificare a mano.
 * Rigenerato da `npm run gen:courses` a partire dai GPX in
 * `scripts/race-courses-gpx/`. Vedi `scripts/generate-race-courses.mjs`.
 */

import type { ParsedCourse } from './gpx'

export interface RaceCourse extends ParsedCourse {
  /** Slug stabile usato come chiave (es. "new-york"). */
  id: string
  /** Città, dal nome del file GPX. */
  city: string
  /** Nome ufficiale della gara, dal tag <name> del GPX. */
  name: string
  /** Paese (facoltativo, per ora vuoto — compilabile a mano se serve). */
  country: string
}

export const RACE_COURSES: RaceCourse[] = [
  {
    "id": "atene",
    "city": "Atene",
    "name": "Athens Marathon",
    "country": "",
    "distanceM": 42265,
    "ascentM": 296,
    "descentM": 238,
    "segments": [
      {
        "km": 1,
        "distanceM": 1000,
        "ascentM": 0,
        "descentM": 9,
        "gradePct": -0.9
      },
      {
        "km": 2,
        "distanceM": 1000,
        "ascentM": 0,
        "descentM": 10,
        "gradePct": -1
      },
      {
        "km": 3,
        "distanceM": 1000,
        "ascentM": 0,
        "descentM": 2,
        "gradePct": -0.2
      },
      {
        "km": 4,
        "distanceM": 1000,
        "ascentM": 0,
        "descentM": 5,
        "gradePct": -0.5
      },
      {
        "km": 5,
        "distanceM": 1000,
        "ascentM": 0,
        "descentM": 3,
        "gradePct": -0.3
      },
      {
        "km": 6,
        "distanceM": 1000,
        "ascentM": 2,
        "descentM": 0,
        "gradePct": 0.2
      },
      {
        "km": 7,
        "distanceM": 1000,
        "ascentM": 0,
        "descentM": 3,
        "gradePct": -0.3
      },
      {
        "km": 8,
        "distanceM": 1000,
        "ascentM": 2,
        "descentM": 0,
        "gradePct": 0.2
      },
      {
        "km": 9,
        "distanceM": 1000,
        "ascentM": 5,
        "descentM": 0,
        "gradePct": 0.5
      },
      {
        "km": 10,
        "distanceM": 1000,
        "ascentM": 5,
        "descentM": 0,
        "gradePct": 0.5
      },
      {
        "km": 11,
        "distanceM": 1000,
        "ascentM": 13,
        "descentM": 0,
        "gradePct": 1.3
      },
      {
        "km": 12,
        "distanceM": 1000,
        "ascentM": 17,
        "descentM": 0,
        "gradePct": 1.7
      },
      {
        "km": 13,
        "distanceM": 1000,
        "ascentM": 12,
        "descentM": 0,
        "gradePct": 1.2
      },
      {
        "km": 14,
        "distanceM": 1000,
        "ascentM": 3,
        "descentM": 0,
        "gradePct": 0.3
      },
      {
        "km": 15,
        "distanceM": 1000,
        "ascentM": 3,
        "descentM": 0,
        "gradePct": 0.3
      },
      {
        "km": 16,
        "distanceM": 1000,
        "ascentM": 22,
        "descentM": 0,
        "gradePct": 2.2
      },
      {
        "km": 17,
        "distanceM": 1000,
        "ascentM": 0,
        "descentM": 33,
        "gradePct": -3.3
      },
      {
        "km": 18,
        "distanceM": 1000,
        "ascentM": 4,
        "descentM": 18,
        "gradePct": -1.4
      },
      {
        "km": 19,
        "distanceM": 1000,
        "ascentM": 4,
        "descentM": 3,
        "gradePct": 0.1
      },
      {
        "km": 20,
        "distanceM": 1000,
        "ascentM": 24,
        "descentM": 0,
        "gradePct": 2.4
      },
      {
        "km": 21,
        "distanceM": 1000,
        "ascentM": 28,
        "descentM": 0,
        "gradePct": 2.8
      },
      {
        "km": 22,
        "distanceM": 1000,
        "ascentM": 13,
        "descentM": 0,
        "gradePct": 1.3
      },
      {
        "km": 23,
        "distanceM": 1000,
        "ascentM": 11,
        "descentM": 0,
        "gradePct": 1.1
      },
      {
        "km": 24,
        "distanceM": 1000,
        "ascentM": 11,
        "descentM": 0,
        "gradePct": 1.1
      },
      {
        "km": 25,
        "distanceM": 1000,
        "ascentM": 31,
        "descentM": 0,
        "gradePct": 3.1
      },
      {
        "km": 26,
        "distanceM": 1000,
        "ascentM": 18,
        "descentM": 0,
        "gradePct": 1.8
      },
      {
        "km": 27,
        "distanceM": 1000,
        "ascentM": 11,
        "descentM": 0,
        "gradePct": 1.1
      },
      {
        "km": 28,
        "distanceM": 1000,
        "ascentM": 15,
        "descentM": 0,
        "gradePct": 1.5
      },
      {
        "km": 29,
        "distanceM": 1000,
        "ascentM": 2,
        "descentM": 2,
        "gradePct": 0
      },
      {
        "km": 30,
        "distanceM": 1000,
        "ascentM": 8,
        "descentM": 0,
        "gradePct": 0.8
      },
      {
        "km": 31,
        "distanceM": 1000,
        "ascentM": 29,
        "descentM": 0,
        "gradePct": 2.9
      },
      {
        "km": 32,
        "distanceM": 1000,
        "ascentM": 4,
        "descentM": 18,
        "gradePct": -1.4
      },
      {
        "km": 33,
        "distanceM": 1000,
        "ascentM": 0,
        "descentM": 19,
        "gradePct": -1.9
      },
      {
        "km": 34,
        "distanceM": 1000,
        "ascentM": 0,
        "descentM": 7,
        "gradePct": -0.7
      },
      {
        "km": 35,
        "distanceM": 1000,
        "ascentM": 0,
        "descentM": 7,
        "gradePct": -0.7
      },
      {
        "km": 36,
        "distanceM": 1000,
        "ascentM": 0,
        "descentM": 5,
        "gradePct": -0.5
      },
      {
        "km": 37,
        "distanceM": 1000,
        "ascentM": 0,
        "descentM": 19,
        "gradePct": -1.9
      },
      {
        "km": 38,
        "distanceM": 1000,
        "ascentM": 0,
        "descentM": 11,
        "gradePct": -1.1
      },
      {
        "km": 39,
        "distanceM": 1000,
        "ascentM": 0,
        "descentM": 14,
        "gradePct": -1.4
      },
      {
        "km": 40,
        "distanceM": 1000,
        "ascentM": 0,
        "descentM": 22,
        "gradePct": -2.2
      },
      {
        "km": 41,
        "distanceM": 1000,
        "ascentM": 0,
        "descentM": 10,
        "gradePct": -1
      },
      {
        "km": 42,
        "distanceM": 1000,
        "ascentM": 0,
        "descentM": 17,
        "gradePct": -1.7
      },
      {
        "km": 43,
        "distanceM": 265,
        "ascentM": 0,
        "descentM": 0,
        "gradePct": 0
      }
    ],
    "hasElevation": true
  },
  {
    "id": "berlino",
    "city": "Berlino",
    "name": "BMW Berlin-Marathon",
    "country": "",
    "distanceM": 42746,
    "ascentM": 21,
    "descentM": 19,
    "segments": [
      {
        "km": 1,
        "distanceM": 1000,
        "ascentM": 0,
        "descentM": 0,
        "gradePct": 0
      },
      {
        "km": 2,
        "distanceM": 1000,
        "ascentM": 0,
        "descentM": 0,
        "gradePct": 0
      },
      {
        "km": 3,
        "distanceM": 1000,
        "ascentM": 0,
        "descentM": 0,
        "gradePct": 0
      },
      {
        "km": 4,
        "distanceM": 1000,
        "ascentM": 2,
        "descentM": 0,
        "gradePct": 0.2
      },
      {
        "km": 5,
        "distanceM": 1000,
        "ascentM": 0,
        "descentM": 0,
        "gradePct": 0
      },
      {
        "km": 6,
        "distanceM": 1000,
        "ascentM": 2,
        "descentM": 0,
        "gradePct": 0.2
      },
      {
        "km": 7,
        "distanceM": 1000,
        "ascentM": 0,
        "descentM": 0,
        "gradePct": 0
      },
      {
        "km": 8,
        "distanceM": 1000,
        "ascentM": 0,
        "descentM": 2,
        "gradePct": -0.1
      },
      {
        "km": 9,
        "distanceM": 1000,
        "ascentM": 2,
        "descentM": 0,
        "gradePct": 0.2
      },
      {
        "km": 10,
        "distanceM": 1000,
        "ascentM": 2,
        "descentM": 0,
        "gradePct": 0.2
      },
      {
        "km": 11,
        "distanceM": 1000,
        "ascentM": 0,
        "descentM": 0,
        "gradePct": 0
      },
      {
        "km": 12,
        "distanceM": 1000,
        "ascentM": 0,
        "descentM": 2,
        "gradePct": -0.1
      },
      {
        "km": 13,
        "distanceM": 1000,
        "ascentM": 0,
        "descentM": 0,
        "gradePct": 0
      },
      {
        "km": 14,
        "distanceM": 1000,
        "ascentM": 0,
        "descentM": 0,
        "gradePct": 0
      },
      {
        "km": 15,
        "distanceM": 1000,
        "ascentM": 0,
        "descentM": 0,
        "gradePct": 0
      },
      {
        "km": 16,
        "distanceM": 1000,
        "ascentM": 0,
        "descentM": 0,
        "gradePct": 0
      },
      {
        "km": 17,
        "distanceM": 1000,
        "ascentM": 0,
        "descentM": 0,
        "gradePct": 0
      },
      {
        "km": 18,
        "distanceM": 1000,
        "ascentM": 0,
        "descentM": 0,
        "gradePct": 0
      },
      {
        "km": 19,
        "distanceM": 1000,
        "ascentM": 0,
        "descentM": 0,
        "gradePct": 0
      },
      {
        "km": 20,
        "distanceM": 1000,
        "ascentM": 0,
        "descentM": 0,
        "gradePct": 0
      },
      {
        "km": 21,
        "distanceM": 1000,
        "ascentM": 0,
        "descentM": 0,
        "gradePct": 0
      },
      {
        "km": 22,
        "distanceM": 1000,
        "ascentM": 0,
        "descentM": 0,
        "gradePct": 0
      },
      {
        "km": 23,
        "distanceM": 1000,
        "ascentM": 0,
        "descentM": 0,
        "gradePct": 0
      },
      {
        "km": 24,
        "distanceM": 1000,
        "ascentM": 2,
        "descentM": 0,
        "gradePct": 0.2
      },
      {
        "km": 25,
        "distanceM": 1000,
        "ascentM": 3,
        "descentM": 0,
        "gradePct": 0.3
      },
      {
        "km": 26,
        "distanceM": 1000,
        "ascentM": 2,
        "descentM": 2,
        "gradePct": 0
      },
      {
        "km": 27,
        "distanceM": 1000,
        "ascentM": 2,
        "descentM": 0,
        "gradePct": 0.2
      },
      {
        "km": 28,
        "distanceM": 1000,
        "ascentM": 7,
        "descentM": 0,
        "gradePct": 0.7
      },
      {
        "km": 29,
        "distanceM": 1000,
        "ascentM": 0,
        "descentM": 0,
        "gradePct": 0
      },
      {
        "km": 30,
        "distanceM": 1000,
        "ascentM": 0,
        "descentM": 2,
        "gradePct": -0.2
      },
      {
        "km": 31,
        "distanceM": 1000,
        "ascentM": 0,
        "descentM": 2,
        "gradePct": -0.1
      },
      {
        "km": 32,
        "distanceM": 1000,
        "ascentM": 0,
        "descentM": 3,
        "gradePct": -0.3
      },
      {
        "km": 33,
        "distanceM": 1000,
        "ascentM": 0,
        "descentM": 5,
        "gradePct": -0.5
      },
      {
        "km": 34,
        "distanceM": 1000,
        "ascentM": 0,
        "descentM": 2,
        "gradePct": -0.2
      },
      {
        "km": 35,
        "distanceM": 1000,
        "ascentM": 0,
        "descentM": 2,
        "gradePct": -0.1
      },
      {
        "km": 36,
        "distanceM": 1000,
        "ascentM": 0,
        "descentM": 0,
        "gradePct": 0
      },
      {
        "km": 37,
        "distanceM": 1000,
        "ascentM": 0,
        "descentM": 0,
        "gradePct": 0
      },
      {
        "km": 38,
        "distanceM": 1000,
        "ascentM": 0,
        "descentM": 0,
        "gradePct": 0
      },
      {
        "km": 39,
        "distanceM": 1000,
        "ascentM": 0,
        "descentM": 0,
        "gradePct": 0
      },
      {
        "km": 40,
        "distanceM": 1000,
        "ascentM": 0,
        "descentM": 0,
        "gradePct": 0
      },
      {
        "km": 41,
        "distanceM": 1000,
        "ascentM": 0,
        "descentM": 0,
        "gradePct": 0
      },
      {
        "km": 42,
        "distanceM": 1000,
        "ascentM": 0,
        "descentM": 0,
        "gradePct": 0
      },
      {
        "km": 43,
        "distanceM": 746,
        "ascentM": 0,
        "descentM": 0,
        "gradePct": 0
      }
    ],
    "hasElevation": true
  },
  {
    "id": "boston",
    "city": "Boston",
    "name": "Boston Marathon",
    "country": "",
    "distanceM": 42428,
    "ascentM": 134,
    "descentM": 267,
    "segments": [
      {
        "km": 1,
        "distanceM": 1000,
        "ascentM": 0,
        "descentM": 33,
        "gradePct": -3.3
      },
      {
        "km": 2,
        "distanceM": 1000,
        "ascentM": 4,
        "descentM": 9,
        "gradePct": -0.5
      },
      {
        "km": 3,
        "distanceM": 1000,
        "ascentM": 0,
        "descentM": 3,
        "gradePct": -0.3
      },
      {
        "km": 4,
        "distanceM": 1000,
        "ascentM": 0,
        "descentM": 7,
        "gradePct": -0.7
      },
      {
        "km": 5,
        "distanceM": 1000,
        "ascentM": 0,
        "descentM": 19,
        "gradePct": -1.9
      },
      {
        "km": 6,
        "distanceM": 1000,
        "ascentM": 0,
        "descentM": 13,
        "gradePct": -1.3
      },
      {
        "km": 7,
        "distanceM": 1000,
        "ascentM": 7,
        "descentM": 2,
        "gradePct": 0.5
      },
      {
        "km": 8,
        "distanceM": 1000,
        "ascentM": 5,
        "descentM": 4,
        "gradePct": 0.1
      },
      {
        "km": 9,
        "distanceM": 1000,
        "ascentM": 0,
        "descentM": 7,
        "gradePct": -0.6
      },
      {
        "km": 10,
        "distanceM": 1000,
        "ascentM": 0,
        "descentM": 5,
        "gradePct": -0.5
      },
      {
        "km": 11,
        "distanceM": 1000,
        "ascentM": 0,
        "descentM": 0,
        "gradePct": 0
      },
      {
        "km": 12,
        "distanceM": 1000,
        "ascentM": 0,
        "descentM": 5,
        "gradePct": -0.5
      },
      {
        "km": 13,
        "distanceM": 1000,
        "ascentM": 5,
        "descentM": 2,
        "gradePct": 0.4
      },
      {
        "km": 14,
        "distanceM": 1000,
        "ascentM": 0,
        "descentM": 5,
        "gradePct": -0.5
      },
      {
        "km": 15,
        "distanceM": 1000,
        "ascentM": 0,
        "descentM": 0,
        "gradePct": 0
      },
      {
        "km": 16,
        "distanceM": 1000,
        "ascentM": 5,
        "descentM": 0,
        "gradePct": 0.5
      },
      {
        "km": 17,
        "distanceM": 1000,
        "ascentM": 5,
        "descentM": 0,
        "gradePct": 0.5
      },
      {
        "km": 18,
        "distanceM": 1000,
        "ascentM": 3,
        "descentM": 0,
        "gradePct": 0.3
      },
      {
        "km": 19,
        "distanceM": 1000,
        "ascentM": 0,
        "descentM": 10,
        "gradePct": -1
      },
      {
        "km": 20,
        "distanceM": 1000,
        "ascentM": 0,
        "descentM": 3,
        "gradePct": -0.3
      },
      {
        "km": 21,
        "distanceM": 1000,
        "ascentM": 0,
        "descentM": 3,
        "gradePct": -0.3
      },
      {
        "km": 22,
        "distanceM": 1000,
        "ascentM": 3,
        "descentM": 5,
        "gradePct": -0.2
      },
      {
        "km": 23,
        "distanceM": 1000,
        "ascentM": 3,
        "descentM": 0,
        "gradePct": 0.3
      },
      {
        "km": 24,
        "distanceM": 1000,
        "ascentM": 5,
        "descentM": 0,
        "gradePct": 0.5
      },
      {
        "km": 25,
        "distanceM": 1000,
        "ascentM": 3,
        "descentM": 10,
        "gradePct": -0.7
      },
      {
        "km": 26,
        "distanceM": 1000,
        "ascentM": 5,
        "descentM": 27,
        "gradePct": -2.2
      },
      {
        "km": 27,
        "distanceM": 1000,
        "ascentM": 19,
        "descentM": 4,
        "gradePct": 1.5
      },
      {
        "km": 28,
        "distanceM": 1000,
        "ascentM": 0,
        "descentM": 5,
        "gradePct": -0.5
      },
      {
        "km": 29,
        "distanceM": 1000,
        "ascentM": 16,
        "descentM": 2,
        "gradePct": 1.4
      },
      {
        "km": 30,
        "distanceM": 1000,
        "ascentM": 2,
        "descentM": 3,
        "gradePct": -0.1
      },
      {
        "km": 31,
        "distanceM": 1000,
        "ascentM": 0,
        "descentM": 13,
        "gradePct": -1.3
      },
      {
        "km": 32,
        "distanceM": 1000,
        "ascentM": 17,
        "descentM": 2,
        "gradePct": 1.6
      },
      {
        "km": 33,
        "distanceM": 1000,
        "ascentM": 14,
        "descentM": 2,
        "gradePct": 1.3
      },
      {
        "km": 34,
        "distanceM": 1000,
        "ascentM": 13,
        "descentM": 3,
        "gradePct": 0.9
      },
      {
        "km": 35,
        "distanceM": 1000,
        "ascentM": 0,
        "descentM": 21,
        "gradePct": -2.1
      },
      {
        "km": 36,
        "distanceM": 1000,
        "ascentM": 0,
        "descentM": 10,
        "gradePct": -1
      },
      {
        "km": 37,
        "distanceM": 1000,
        "ascentM": 0,
        "descentM": 5,
        "gradePct": -0.5
      },
      {
        "km": 38,
        "distanceM": 1000,
        "ascentM": 2,
        "descentM": 8,
        "gradePct": -0.6
      },
      {
        "km": 39,
        "distanceM": 1000,
        "ascentM": 0,
        "descentM": 17,
        "gradePct": -1.7
      },
      {
        "km": 40,
        "distanceM": 1000,
        "ascentM": 0,
        "descentM": 2,
        "gradePct": -0.2
      },
      {
        "km": 41,
        "distanceM": 1000,
        "ascentM": 0,
        "descentM": 2,
        "gradePct": -0.2
      },
      {
        "km": 42,
        "distanceM": 1000,
        "ascentM": 0,
        "descentM": 0,
        "gradePct": 0
      },
      {
        "km": 43,
        "distanceM": 428,
        "ascentM": 0,
        "descentM": 0,
        "gradePct": 0
      }
    ],
    "hasElevation": true
  },
  {
    "id": "firenze",
    "city": "Firenze",
    "name": "Half Marathon Firenze",
    "country": "",
    "distanceM": 21098,
    "ascentM": 96,
    "descentM": 92,
    "segments": [
      {
        "km": 1,
        "distanceM": 1000,
        "ascentM": 5,
        "descentM": 2,
        "gradePct": 0.3
      },
      {
        "km": 2,
        "distanceM": 1000,
        "ascentM": 8,
        "descentM": 6,
        "gradePct": 0.2
      },
      {
        "km": 3,
        "distanceM": 1000,
        "ascentM": 9,
        "descentM": 2,
        "gradePct": 0.7
      },
      {
        "km": 4,
        "distanceM": 1000,
        "ascentM": 6,
        "descentM": 14,
        "gradePct": -0.8
      },
      {
        "km": 5,
        "distanceM": 1000,
        "ascentM": 0,
        "descentM": 5,
        "gradePct": -0.5
      },
      {
        "km": 6,
        "distanceM": 1000,
        "ascentM": 4,
        "descentM": 0,
        "gradePct": 0.4
      },
      {
        "km": 7,
        "distanceM": 1000,
        "ascentM": 0,
        "descentM": 9,
        "gradePct": -0.8
      },
      {
        "km": 8,
        "distanceM": 1000,
        "ascentM": 4,
        "descentM": 2,
        "gradePct": 0.2
      },
      {
        "km": 9,
        "distanceM": 1000,
        "ascentM": 9,
        "descentM": 2,
        "gradePct": 0.7
      },
      {
        "km": 10,
        "distanceM": 1000,
        "ascentM": 5,
        "descentM": 0,
        "gradePct": 0.5
      },
      {
        "km": 11,
        "distanceM": 1000,
        "ascentM": 3,
        "descentM": 11,
        "gradePct": -0.8
      },
      {
        "km": 12,
        "distanceM": 1000,
        "ascentM": 13,
        "descentM": 0,
        "gradePct": 1.3
      },
      {
        "km": 13,
        "distanceM": 1000,
        "ascentM": 5,
        "descentM": 8,
        "gradePct": -0.4
      },
      {
        "km": 14,
        "distanceM": 1000,
        "ascentM": 0,
        "descentM": 11,
        "gradePct": -1
      },
      {
        "km": 15,
        "distanceM": 1000,
        "ascentM": 2,
        "descentM": 2,
        "gradePct": 0.1
      },
      {
        "km": 16,
        "distanceM": 1000,
        "ascentM": 2,
        "descentM": 8,
        "gradePct": -0.6
      },
      {
        "km": 17,
        "distanceM": 1000,
        "ascentM": 0,
        "descentM": 2,
        "gradePct": -0.1
      },
      {
        "km": 18,
        "distanceM": 1000,
        "ascentM": 11,
        "descentM": 0,
        "gradePct": 1.1
      },
      {
        "km": 19,
        "distanceM": 1000,
        "ascentM": 0,
        "descentM": 2,
        "gradePct": -0.2
      },
      {
        "km": 20,
        "distanceM": 1000,
        "ascentM": 5,
        "descentM": 10,
        "gradePct": -0.5
      },
      {
        "km": 21,
        "distanceM": 1098,
        "ascentM": 5,
        "descentM": 0,
        "gradePct": 0.5
      }
    ],
    "hasElevation": true
  },
  {
    "id": "newyork",
    "city": "NewYork",
    "name": "TCS New York City Marathon",
    "country": "",
    "distanceM": 42608,
    "ascentM": 73,
    "descentM": 99,
    "segments": [
      {
        "km": 1,
        "distanceM": 1000,
        "ascentM": 5,
        "descentM": 0,
        "gradePct": 0.5
      },
      {
        "km": 2,
        "distanceM": 1000,
        "ascentM": 0,
        "descentM": 16,
        "gradePct": -1.6
      },
      {
        "km": 3,
        "distanceM": 1000,
        "ascentM": 0,
        "descentM": 16,
        "gradePct": -1.6
      },
      {
        "km": 4,
        "distanceM": 1000,
        "ascentM": 2,
        "descentM": 0,
        "gradePct": 0.2
      },
      {
        "km": 5,
        "distanceM": 1000,
        "ascentM": 0,
        "descentM": 0,
        "gradePct": 0
      },
      {
        "km": 6,
        "distanceM": 1000,
        "ascentM": 0,
        "descentM": 2,
        "gradePct": -0.2
      },
      {
        "km": 7,
        "distanceM": 1000,
        "ascentM": 0,
        "descentM": 0,
        "gradePct": 0
      },
      {
        "km": 8,
        "distanceM": 1000,
        "ascentM": 0,
        "descentM": 5,
        "gradePct": -0.5
      },
      {
        "km": 9,
        "distanceM": 1000,
        "ascentM": 0,
        "descentM": 6,
        "gradePct": -0.6
      },
      {
        "km": 10,
        "distanceM": 1000,
        "ascentM": 2,
        "descentM": 0,
        "gradePct": 0.2
      },
      {
        "km": 11,
        "distanceM": 1000,
        "ascentM": 0,
        "descentM": 2,
        "gradePct": -0.1
      },
      {
        "km": 12,
        "distanceM": 1000,
        "ascentM": 0,
        "descentM": 0,
        "gradePct": 0
      },
      {
        "km": 13,
        "distanceM": 1000,
        "ascentM": 7,
        "descentM": 0,
        "gradePct": 0.7
      },
      {
        "km": 14,
        "distanceM": 1000,
        "ascentM": 2,
        "descentM": 0,
        "gradePct": 0.2
      },
      {
        "km": 15,
        "distanceM": 1000,
        "ascentM": 0,
        "descentM": 7,
        "gradePct": -0.7
      },
      {
        "km": 16,
        "distanceM": 1000,
        "ascentM": 0,
        "descentM": 4,
        "gradePct": -0.4
      },
      {
        "km": 17,
        "distanceM": 1000,
        "ascentM": 5,
        "descentM": 0,
        "gradePct": 0.5
      },
      {
        "km": 18,
        "distanceM": 1000,
        "ascentM": 0,
        "descentM": 2,
        "gradePct": -0.2
      },
      {
        "km": 19,
        "distanceM": 1000,
        "ascentM": 0,
        "descentM": 2,
        "gradePct": -0.2
      },
      {
        "km": 20,
        "distanceM": 1000,
        "ascentM": 0,
        "descentM": 3,
        "gradePct": -0.3
      },
      {
        "km": 21,
        "distanceM": 1000,
        "ascentM": 0,
        "descentM": 2,
        "gradePct": -0.1
      },
      {
        "km": 22,
        "distanceM": 1000,
        "ascentM": 0,
        "descentM": 0,
        "gradePct": 0
      },
      {
        "km": 23,
        "distanceM": 1000,
        "ascentM": 0,
        "descentM": 0,
        "gradePct": 0
      },
      {
        "km": 24,
        "distanceM": 1000,
        "ascentM": 4,
        "descentM": 0,
        "gradePct": 0.4
      },
      {
        "km": 25,
        "distanceM": 1000,
        "ascentM": 4,
        "descentM": 0,
        "gradePct": 0.4
      },
      {
        "km": 26,
        "distanceM": 1000,
        "ascentM": 2,
        "descentM": 0,
        "gradePct": 0.2
      },
      {
        "km": 27,
        "distanceM": 1000,
        "ascentM": 0,
        "descentM": 0,
        "gradePct": 0
      },
      {
        "km": 28,
        "distanceM": 1000,
        "ascentM": 0,
        "descentM": 2,
        "gradePct": -0.2
      },
      {
        "km": 29,
        "distanceM": 1000,
        "ascentM": 0,
        "descentM": 7,
        "gradePct": -0.7
      },
      {
        "km": 30,
        "distanceM": 1000,
        "ascentM": 0,
        "descentM": 2,
        "gradePct": -0.2
      },
      {
        "km": 31,
        "distanceM": 1000,
        "ascentM": 2,
        "descentM": 0,
        "gradePct": 0.2
      },
      {
        "km": 32,
        "distanceM": 1000,
        "ascentM": 4,
        "descentM": 0,
        "gradePct": 0.4
      },
      {
        "km": 33,
        "distanceM": 1000,
        "ascentM": 0,
        "descentM": 0,
        "gradePct": 0
      },
      {
        "km": 34,
        "distanceM": 1000,
        "ascentM": 0,
        "descentM": 5,
        "gradePct": -0.5
      },
      {
        "km": 35,
        "distanceM": 1000,
        "ascentM": 2,
        "descentM": 0,
        "gradePct": 0.2
      },
      {
        "km": 36,
        "distanceM": 1000,
        "ascentM": 2,
        "descentM": 0,
        "gradePct": 0.2
      },
      {
        "km": 37,
        "distanceM": 1000,
        "ascentM": 9,
        "descentM": 0,
        "gradePct": 0.9
      },
      {
        "km": 38,
        "distanceM": 1000,
        "ascentM": 7,
        "descentM": 0,
        "gradePct": 0.7
      },
      {
        "km": 39,
        "distanceM": 1000,
        "ascentM": 9,
        "descentM": 0,
        "gradePct": 0.9
      },
      {
        "km": 40,
        "distanceM": 1000,
        "ascentM": 0,
        "descentM": 12,
        "gradePct": -1.2
      },
      {
        "km": 41,
        "distanceM": 1000,
        "ascentM": 3,
        "descentM": 5,
        "gradePct": -0.2
      },
      {
        "km": 42,
        "distanceM": 1000,
        "ascentM": 4,
        "descentM": 0,
        "gradePct": 0.4
      },
      {
        "km": 43,
        "distanceM": 608,
        "ascentM": 2,
        "descentM": 0,
        "gradePct": 0.3
      }
    ],
    "hasElevation": true
  },
  {
    "id": "parigi",
    "city": "Parigi",
    "name": "Marathon de Paris",
    "country": "",
    "distanceM": 42180,
    "ascentM": 126,
    "descentM": 107,
    "segments": [
      {
        "km": 1,
        "distanceM": 1000,
        "ascentM": 2,
        "descentM": 0,
        "gradePct": 0.2
      },
      {
        "km": 2,
        "distanceM": 1000,
        "ascentM": 7,
        "descentM": 0,
        "gradePct": 0.7
      },
      {
        "km": 3,
        "distanceM": 1000,
        "ascentM": 3,
        "descentM": 3,
        "gradePct": 0.1
      },
      {
        "km": 4,
        "distanceM": 1000,
        "ascentM": 0,
        "descentM": 0,
        "gradePct": 0
      },
      {
        "km": 5,
        "distanceM": 1000,
        "ascentM": 0,
        "descentM": 2,
        "gradePct": -0.2
      },
      {
        "km": 6,
        "distanceM": 1000,
        "ascentM": 0,
        "descentM": 0,
        "gradePct": 0
      },
      {
        "km": 7,
        "distanceM": 1000,
        "ascentM": 0,
        "descentM": 2,
        "gradePct": -0.2
      },
      {
        "km": 8,
        "distanceM": 1000,
        "ascentM": 4,
        "descentM": 5,
        "gradePct": -0.1
      },
      {
        "km": 9,
        "distanceM": 1000,
        "ascentM": 13,
        "descentM": 0,
        "gradePct": 1.3
      },
      {
        "km": 10,
        "distanceM": 1000,
        "ascentM": 3,
        "descentM": 0,
        "gradePct": 0.3
      },
      {
        "km": 11,
        "distanceM": 1000,
        "ascentM": 2,
        "descentM": 14,
        "gradePct": -1.2
      },
      {
        "km": 12,
        "distanceM": 1000,
        "ascentM": 7,
        "descentM": 0,
        "gradePct": 0.7
      },
      {
        "km": 13,
        "distanceM": 1000,
        "ascentM": 0,
        "descentM": 5,
        "gradePct": -0.5
      },
      {
        "km": 14,
        "distanceM": 1000,
        "ascentM": 2,
        "descentM": 0,
        "gradePct": 0.2
      },
      {
        "km": 15,
        "distanceM": 1000,
        "ascentM": 6,
        "descentM": 2,
        "gradePct": 0.4
      },
      {
        "km": 16,
        "distanceM": 1000,
        "ascentM": 5,
        "descentM": 3,
        "gradePct": 0.2
      },
      {
        "km": 17,
        "distanceM": 1000,
        "ascentM": 14,
        "descentM": 0,
        "gradePct": 1.4
      },
      {
        "km": 18,
        "distanceM": 1000,
        "ascentM": 5,
        "descentM": 10,
        "gradePct": -0.4
      },
      {
        "km": 19,
        "distanceM": 1000,
        "ascentM": 0,
        "descentM": 9,
        "gradePct": -0.9
      },
      {
        "km": 20,
        "distanceM": 1000,
        "ascentM": 0,
        "descentM": 5,
        "gradePct": -0.5
      },
      {
        "km": 21,
        "distanceM": 1000,
        "ascentM": 0,
        "descentM": 2,
        "gradePct": -0.2
      },
      {
        "km": 22,
        "distanceM": 1000,
        "ascentM": 0,
        "descentM": 5,
        "gradePct": -0.5
      },
      {
        "km": 23,
        "distanceM": 1000,
        "ascentM": 0,
        "descentM": 0,
        "gradePct": 0
      },
      {
        "km": 24,
        "distanceM": 1000,
        "ascentM": 0,
        "descentM": 0,
        "gradePct": 0
      },
      {
        "km": 25,
        "distanceM": 1000,
        "ascentM": 0,
        "descentM": 5,
        "gradePct": -0.5
      },
      {
        "km": 26,
        "distanceM": 1000,
        "ascentM": 0,
        "descentM": 8,
        "gradePct": -0.8
      },
      {
        "km": 27,
        "distanceM": 1000,
        "ascentM": 13,
        "descentM": 0,
        "gradePct": 1.3
      },
      {
        "km": 28,
        "distanceM": 1000,
        "ascentM": 0,
        "descentM": 2,
        "gradePct": -0.2
      },
      {
        "km": 29,
        "distanceM": 1000,
        "ascentM": 0,
        "descentM": 2,
        "gradePct": -0.2
      },
      {
        "km": 30,
        "distanceM": 1000,
        "ascentM": 0,
        "descentM": 3,
        "gradePct": -0.2
      },
      {
        "km": 31,
        "distanceM": 1000,
        "ascentM": 0,
        "descentM": 2,
        "gradePct": -0.2
      },
      {
        "km": 32,
        "distanceM": 1000,
        "ascentM": 2,
        "descentM": 2,
        "gradePct": 0
      },
      {
        "km": 33,
        "distanceM": 1000,
        "ascentM": 4,
        "descentM": 0,
        "gradePct": 0.4
      },
      {
        "km": 34,
        "distanceM": 1000,
        "ascentM": 4,
        "descentM": 0,
        "gradePct": 0.4
      },
      {
        "km": 35,
        "distanceM": 1000,
        "ascentM": 0,
        "descentM": 3,
        "gradePct": -0.3
      },
      {
        "km": 36,
        "distanceM": 1000,
        "ascentM": 2,
        "descentM": 4,
        "gradePct": -0.2
      },
      {
        "km": 37,
        "distanceM": 1000,
        "ascentM": 5,
        "descentM": 0,
        "gradePct": 0.5
      },
      {
        "km": 38,
        "distanceM": 1000,
        "ascentM": 7,
        "descentM": 0,
        "gradePct": 0.7
      },
      {
        "km": 39,
        "distanceM": 1000,
        "ascentM": 10,
        "descentM": 2,
        "gradePct": 0.9
      },
      {
        "km": 40,
        "distanceM": 1000,
        "ascentM": 6,
        "descentM": 0,
        "gradePct": 0.6
      },
      {
        "km": 41,
        "distanceM": 1000,
        "ascentM": 0,
        "descentM": 5,
        "gradePct": -0.5
      },
      {
        "km": 42,
        "distanceM": 1180,
        "ascentM": 0,
        "descentM": 7,
        "gradePct": -0.6
      }
    ],
    "hasElevation": true
  },
  {
    "id": "roma-ostia",
    "city": "Roma-Ostia",
    "name": "48° Roma-Ostia",
    "country": "",
    "distanceM": 21693,
    "ascentM": 131,
    "descentM": 153,
    "segments": [
      {
        "km": 1,
        "distanceM": 1000,
        "ascentM": 64,
        "descentM": 47,
        "gradePct": 1.7
      },
      {
        "km": 2,
        "distanceM": 1000,
        "ascentM": 17,
        "descentM": 41,
        "gradePct": -2.5
      },
      {
        "km": 3,
        "distanceM": 1000,
        "ascentM": 46,
        "descentM": 56,
        "gradePct": -1
      },
      {
        "km": 4,
        "distanceM": 1000,
        "ascentM": 0,
        "descentM": 6,
        "gradePct": -0.6
      },
      {
        "km": 5,
        "distanceM": 1000,
        "ascentM": 0,
        "descentM": 0,
        "gradePct": 0
      },
      {
        "km": 6,
        "distanceM": 1000,
        "ascentM": 0,
        "descentM": 0,
        "gradePct": 0
      },
      {
        "km": 7,
        "distanceM": 1000,
        "ascentM": 0,
        "descentM": 0,
        "gradePct": 0
      },
      {
        "km": 8,
        "distanceM": 1000,
        "ascentM": 0,
        "descentM": 0,
        "gradePct": 0
      },
      {
        "km": 9,
        "distanceM": 1000,
        "ascentM": 0,
        "descentM": 0,
        "gradePct": 0
      },
      {
        "km": 10,
        "distanceM": 1000,
        "ascentM": 0,
        "descentM": 0,
        "gradePct": 0
      },
      {
        "km": 11,
        "distanceM": 1000,
        "ascentM": 0,
        "descentM": 0,
        "gradePct": 0
      },
      {
        "km": 12,
        "distanceM": 1000,
        "ascentM": 0,
        "descentM": 0,
        "gradePct": 0
      },
      {
        "km": 13,
        "distanceM": 1000,
        "ascentM": 2,
        "descentM": 0,
        "gradePct": 0.2
      },
      {
        "km": 14,
        "distanceM": 1000,
        "ascentM": 0,
        "descentM": 0,
        "gradePct": 0
      },
      {
        "km": 15,
        "distanceM": 1000,
        "ascentM": 0,
        "descentM": 0,
        "gradePct": 0
      },
      {
        "km": 16,
        "distanceM": 1000,
        "ascentM": 0,
        "descentM": 0,
        "gradePct": 0
      },
      {
        "km": 17,
        "distanceM": 1000,
        "ascentM": 0,
        "descentM": 0,
        "gradePct": 0
      },
      {
        "km": 18,
        "distanceM": 1000,
        "ascentM": 0,
        "descentM": 0,
        "gradePct": 0
      },
      {
        "km": 19,
        "distanceM": 1000,
        "ascentM": 2,
        "descentM": 0,
        "gradePct": 0.2
      },
      {
        "km": 20,
        "distanceM": 1000,
        "ascentM": 0,
        "descentM": 0,
        "gradePct": 0
      },
      {
        "km": 21,
        "distanceM": 1000,
        "ascentM": 0,
        "descentM": 0,
        "gradePct": 0
      },
      {
        "km": 22,
        "distanceM": 693,
        "ascentM": 0,
        "descentM": 3,
        "gradePct": -0.4
      }
    ],
    "hasElevation": true
  },
  {
    "id": "roma",
    "city": "Roma",
    "name": "Run Rome The Marathon",
    "country": "",
    "distanceM": 42161,
    "ascentM": 166,
    "descentM": 171,
    "segments": [
      {
        "km": 1,
        "distanceM": 1000,
        "ascentM": 0,
        "descentM": 0,
        "gradePct": 0
      },
      {
        "km": 2,
        "distanceM": 1000,
        "ascentM": 9,
        "descentM": 9,
        "gradePct": 0
      },
      {
        "km": 3,
        "distanceM": 1000,
        "ascentM": 0,
        "descentM": 7,
        "gradePct": -0.7
      },
      {
        "km": 4,
        "distanceM": 1000,
        "ascentM": 12,
        "descentM": 6,
        "gradePct": 0.6
      },
      {
        "km": 5,
        "distanceM": 1000,
        "ascentM": 5,
        "descentM": 0,
        "gradePct": 0.5
      },
      {
        "km": 6,
        "distanceM": 1000,
        "ascentM": 4,
        "descentM": 16,
        "gradePct": -1.2
      },
      {
        "km": 7,
        "distanceM": 1000,
        "ascentM": 5,
        "descentM": 7,
        "gradePct": -0.1
      },
      {
        "km": 8,
        "distanceM": 1000,
        "ascentM": 8,
        "descentM": 2,
        "gradePct": 0.7
      },
      {
        "km": 9,
        "distanceM": 1000,
        "ascentM": 4,
        "descentM": 9,
        "gradePct": -0.5
      },
      {
        "km": 10,
        "distanceM": 1000,
        "ascentM": 8,
        "descentM": 2,
        "gradePct": 0.6
      },
      {
        "km": 11,
        "distanceM": 1000,
        "ascentM": 0,
        "descentM": 10,
        "gradePct": -1
      },
      {
        "km": 12,
        "distanceM": 1000,
        "ascentM": 9,
        "descentM": 0,
        "gradePct": 0.9
      },
      {
        "km": 13,
        "distanceM": 1000,
        "ascentM": 0,
        "descentM": 2,
        "gradePct": -0.2
      },
      {
        "km": 14,
        "distanceM": 1000,
        "ascentM": 6,
        "descentM": 0,
        "gradePct": 0.6
      },
      {
        "km": 15,
        "distanceM": 1000,
        "ascentM": 2,
        "descentM": 5,
        "gradePct": -0.4
      },
      {
        "km": 16,
        "distanceM": 1000,
        "ascentM": 8,
        "descentM": 8,
        "gradePct": 0
      },
      {
        "km": 17,
        "distanceM": 1000,
        "ascentM": 4,
        "descentM": 0,
        "gradePct": 0.4
      },
      {
        "km": 18,
        "distanceM": 1000,
        "ascentM": 2,
        "descentM": 2,
        "gradePct": 0
      },
      {
        "km": 19,
        "distanceM": 1000,
        "ascentM": 3,
        "descentM": 3,
        "gradePct": 0
      },
      {
        "km": 20,
        "distanceM": 1000,
        "ascentM": 3,
        "descentM": 2,
        "gradePct": 0.2
      },
      {
        "km": 21,
        "distanceM": 1000,
        "ascentM": 9,
        "descentM": 9,
        "gradePct": 0
      },
      {
        "km": 22,
        "distanceM": 1000,
        "ascentM": 5,
        "descentM": 7,
        "gradePct": -0.2
      },
      {
        "km": 23,
        "distanceM": 1000,
        "ascentM": 2,
        "descentM": 4,
        "gradePct": -0.2
      },
      {
        "km": 24,
        "distanceM": 1000,
        "ascentM": 2,
        "descentM": 3,
        "gradePct": -0.2
      },
      {
        "km": 25,
        "distanceM": 1000,
        "ascentM": 3,
        "descentM": 8,
        "gradePct": -0.5
      },
      {
        "km": 26,
        "distanceM": 1000,
        "ascentM": 4,
        "descentM": 0,
        "gradePct": 0.4
      },
      {
        "km": 27,
        "distanceM": 1000,
        "ascentM": 0,
        "descentM": 2,
        "gradePct": -0.2
      },
      {
        "km": 28,
        "distanceM": 1000,
        "ascentM": 3,
        "descentM": 8,
        "gradePct": -0.5
      },
      {
        "km": 29,
        "distanceM": 1000,
        "ascentM": 12,
        "descentM": 4,
        "gradePct": 0.8
      },
      {
        "km": 30,
        "distanceM": 1000,
        "ascentM": 0,
        "descentM": 3,
        "gradePct": -0.3
      },
      {
        "km": 31,
        "distanceM": 1000,
        "ascentM": 4,
        "descentM": 5,
        "gradePct": -0.2
      },
      {
        "km": 32,
        "distanceM": 1000,
        "ascentM": 5,
        "descentM": 0,
        "gradePct": 0.5
      },
      {
        "km": 33,
        "distanceM": 1000,
        "ascentM": 2,
        "descentM": 0,
        "gradePct": 0.2
      },
      {
        "km": 34,
        "distanceM": 1000,
        "ascentM": 0,
        "descentM": 7,
        "gradePct": -0.7
      },
      {
        "km": 35,
        "distanceM": 1000,
        "ascentM": 5,
        "descentM": 2,
        "gradePct": 0.3
      },
      {
        "km": 36,
        "distanceM": 1000,
        "ascentM": 0,
        "descentM": 2,
        "gradePct": -0.2
      },
      {
        "km": 37,
        "distanceM": 1000,
        "ascentM": 10,
        "descentM": 0,
        "gradePct": 1
      },
      {
        "km": 38,
        "distanceM": 1000,
        "ascentM": 7,
        "descentM": 2,
        "gradePct": 0.5
      },
      {
        "km": 39,
        "distanceM": 1000,
        "ascentM": 0,
        "descentM": 6,
        "gradePct": -0.6
      },
      {
        "km": 40,
        "distanceM": 1000,
        "ascentM": 3,
        "descentM": 3,
        "gradePct": 0
      },
      {
        "km": 41,
        "distanceM": 1000,
        "ascentM": 0,
        "descentM": 4,
        "gradePct": -0.4
      },
      {
        "km": 42,
        "distanceM": 1161,
        "ascentM": 2,
        "descentM": 6,
        "gradePct": -0.4
      }
    ],
    "hasElevation": true
  },
  {
    "id": "stramilano",
    "city": "Stramilano",
    "name": "Stramilano",
    "country": "",
    "distanceM": 21465,
    "ascentM": 42,
    "descentM": 39,
    "segments": [
      {
        "km": 1,
        "distanceM": 1000,
        "ascentM": 0,
        "descentM": 0,
        "gradePct": 0
      },
      {
        "km": 2,
        "distanceM": 1000,
        "ascentM": 3,
        "descentM": 0,
        "gradePct": 0.3
      },
      {
        "km": 3,
        "distanceM": 1000,
        "ascentM": 2,
        "descentM": 4,
        "gradePct": -0.2
      },
      {
        "km": 4,
        "distanceM": 1000,
        "ascentM": 0,
        "descentM": 0,
        "gradePct": 0
      },
      {
        "km": 5,
        "distanceM": 1000,
        "ascentM": 2,
        "descentM": 5,
        "gradePct": -0.4
      },
      {
        "km": 6,
        "distanceM": 1000,
        "ascentM": 2,
        "descentM": 3,
        "gradePct": -0.2
      },
      {
        "km": 7,
        "distanceM": 1000,
        "ascentM": 2,
        "descentM": 2,
        "gradePct": 0
      },
      {
        "km": 8,
        "distanceM": 1000,
        "ascentM": 0,
        "descentM": 2,
        "gradePct": -0.1
      },
      {
        "km": 9,
        "distanceM": 1000,
        "ascentM": 2,
        "descentM": 0,
        "gradePct": 0.2
      },
      {
        "km": 10,
        "distanceM": 1000,
        "ascentM": 8,
        "descentM": 4,
        "gradePct": 0.5
      },
      {
        "km": 11,
        "distanceM": 1000,
        "ascentM": 2,
        "descentM": 2,
        "gradePct": 0
      },
      {
        "km": 12,
        "distanceM": 1000,
        "ascentM": 4,
        "descentM": 5,
        "gradePct": -0.1
      },
      {
        "km": 13,
        "distanceM": 1000,
        "ascentM": 0,
        "descentM": 4,
        "gradePct": -0.4
      },
      {
        "km": 14,
        "distanceM": 1000,
        "ascentM": 0,
        "descentM": 3,
        "gradePct": -0.3
      },
      {
        "km": 15,
        "distanceM": 1000,
        "ascentM": 3,
        "descentM": 0,
        "gradePct": 0.3
      },
      {
        "km": 16,
        "distanceM": 1000,
        "ascentM": 2,
        "descentM": 3,
        "gradePct": -0.1
      },
      {
        "km": 17,
        "distanceM": 1000,
        "ascentM": 7,
        "descentM": 0,
        "gradePct": 0.7
      },
      {
        "km": 18,
        "distanceM": 1000,
        "ascentM": 0,
        "descentM": 0,
        "gradePct": 0
      },
      {
        "km": 19,
        "distanceM": 1000,
        "ascentM": 5,
        "descentM": 2,
        "gradePct": 0.4
      },
      {
        "km": 20,
        "distanceM": 1000,
        "ascentM": 0,
        "descentM": 3,
        "gradePct": -0.3
      },
      {
        "km": 21,
        "distanceM": 1000,
        "ascentM": 0,
        "descentM": 0,
        "gradePct": 0
      },
      {
        "km": 22,
        "distanceM": 465,
        "ascentM": 0,
        "descentM": 0,
        "gradePct": 0
      }
    ],
    "hasElevation": true
  },
  {
    "id": "valencia",
    "city": "Valencia",
    "name": "Valencia Marathon Trinidad Alfonso EDP",
    "country": "",
    "distanceM": 42273,
    "ascentM": 78,
    "descentM": 84,
    "segments": [
      {
        "km": 1,
        "distanceM": 1000,
        "ascentM": 8,
        "descentM": 12,
        "gradePct": -0.4
      },
      {
        "km": 2,
        "distanceM": 1000,
        "ascentM": 0,
        "descentM": 2,
        "gradePct": -0.2
      },
      {
        "km": 3,
        "distanceM": 1000,
        "ascentM": 0,
        "descentM": 0,
        "gradePct": 0
      },
      {
        "km": 4,
        "distanceM": 1000,
        "ascentM": 0,
        "descentM": 0,
        "gradePct": 0
      },
      {
        "km": 5,
        "distanceM": 1000,
        "ascentM": 2,
        "descentM": 2,
        "gradePct": 0
      },
      {
        "km": 6,
        "distanceM": 1000,
        "ascentM": 3,
        "descentM": 0,
        "gradePct": 0.3
      },
      {
        "km": 7,
        "distanceM": 1000,
        "ascentM": 0,
        "descentM": 0,
        "gradePct": 0
      },
      {
        "km": 8,
        "distanceM": 1000,
        "ascentM": 0,
        "descentM": 0,
        "gradePct": 0
      },
      {
        "km": 9,
        "distanceM": 1000,
        "ascentM": 0,
        "descentM": 3,
        "gradePct": -0.3
      },
      {
        "km": 10,
        "distanceM": 1000,
        "ascentM": 0,
        "descentM": 0,
        "gradePct": 0
      },
      {
        "km": 11,
        "distanceM": 1000,
        "ascentM": 2,
        "descentM": 0,
        "gradePct": 0.2
      },
      {
        "km": 12,
        "distanceM": 1000,
        "ascentM": 2,
        "descentM": 0,
        "gradePct": 0.2
      },
      {
        "km": 13,
        "distanceM": 1000,
        "ascentM": 2,
        "descentM": 2,
        "gradePct": 0.1
      },
      {
        "km": 14,
        "distanceM": 1000,
        "ascentM": 2,
        "descentM": 0,
        "gradePct": 0.2
      },
      {
        "km": 15,
        "distanceM": 1000,
        "ascentM": 4,
        "descentM": 2,
        "gradePct": 0.2
      },
      {
        "km": 16,
        "distanceM": 1000,
        "ascentM": 2,
        "descentM": 0,
        "gradePct": 0.2
      },
      {
        "km": 17,
        "distanceM": 1000,
        "ascentM": 0,
        "descentM": 5,
        "gradePct": -0.5
      },
      {
        "km": 18,
        "distanceM": 1000,
        "ascentM": 2,
        "descentM": 2,
        "gradePct": 0
      },
      {
        "km": 19,
        "distanceM": 1000,
        "ascentM": 0,
        "descentM": 4,
        "gradePct": -0.4
      },
      {
        "km": 20,
        "distanceM": 1000,
        "ascentM": 0,
        "descentM": 0,
        "gradePct": 0
      },
      {
        "km": 21,
        "distanceM": 1000,
        "ascentM": 0,
        "descentM": 2,
        "gradePct": -0.2
      },
      {
        "km": 22,
        "distanceM": 1000,
        "ascentM": 0,
        "descentM": 0,
        "gradePct": 0
      },
      {
        "km": 23,
        "distanceM": 1000,
        "ascentM": 0,
        "descentM": 0,
        "gradePct": 0
      },
      {
        "km": 24,
        "distanceM": 1000,
        "ascentM": 0,
        "descentM": 0,
        "gradePct": 0
      },
      {
        "km": 25,
        "distanceM": 1000,
        "ascentM": 4,
        "descentM": 0,
        "gradePct": 0.4
      },
      {
        "km": 26,
        "distanceM": 1000,
        "ascentM": 2,
        "descentM": 0,
        "gradePct": 0.2
      },
      {
        "km": 27,
        "distanceM": 1000,
        "ascentM": 2,
        "descentM": 0,
        "gradePct": 0.2
      },
      {
        "km": 28,
        "distanceM": 1000,
        "ascentM": 8,
        "descentM": 3,
        "gradePct": 0.5
      },
      {
        "km": 29,
        "distanceM": 1000,
        "ascentM": 4,
        "descentM": 7,
        "gradePct": -0.2
      },
      {
        "km": 30,
        "distanceM": 1000,
        "ascentM": 0,
        "descentM": 0,
        "gradePct": 0
      },
      {
        "km": 31,
        "distanceM": 1000,
        "ascentM": 6,
        "descentM": 0,
        "gradePct": 0.6
      },
      {
        "km": 32,
        "distanceM": 1000,
        "ascentM": 6,
        "descentM": 4,
        "gradePct": 0.2
      },
      {
        "km": 33,
        "distanceM": 1000,
        "ascentM": 4,
        "descentM": 0,
        "gradePct": 0.4
      },
      {
        "km": 34,
        "distanceM": 1000,
        "ascentM": 6,
        "descentM": 10,
        "gradePct": -0.4
      },
      {
        "km": 35,
        "distanceM": 1000,
        "ascentM": 8,
        "descentM": 2,
        "gradePct": 0.6
      },
      {
        "km": 36,
        "distanceM": 1000,
        "ascentM": 0,
        "descentM": 4,
        "gradePct": -0.4
      },
      {
        "km": 37,
        "distanceM": 1000,
        "ascentM": 0,
        "descentM": 2,
        "gradePct": -0.2
      },
      {
        "km": 38,
        "distanceM": 1000,
        "ascentM": 0,
        "descentM": 4,
        "gradePct": -0.4
      },
      {
        "km": 39,
        "distanceM": 1000,
        "ascentM": 0,
        "descentM": 5,
        "gradePct": -0.5
      },
      {
        "km": 40,
        "distanceM": 1000,
        "ascentM": 0,
        "descentM": 2,
        "gradePct": -0.2
      },
      {
        "km": 41,
        "distanceM": 1000,
        "ascentM": 0,
        "descentM": 2,
        "gradePct": -0.2
      },
      {
        "km": 42,
        "distanceM": 1000,
        "ascentM": 0,
        "descentM": 6,
        "gradePct": -0.6
      },
      {
        "km": 43,
        "distanceM": 273,
        "ascentM": 0,
        "descentM": 0,
        "gradePct": 0
      }
    ],
    "hasElevation": true
  },
  {
    "id": "venezia",
    "city": "Venezia",
    "name": "Venice Marathon",
    "country": "",
    "distanceM": 42530,
    "ascentM": 54,
    "descentM": 57,
    "segments": [
      {
        "km": 1,
        "distanceM": 1000,
        "ascentM": 2,
        "descentM": 2,
        "gradePct": 0
      },
      {
        "km": 2,
        "distanceM": 1000,
        "ascentM": 0,
        "descentM": 0,
        "gradePct": 0
      },
      {
        "km": 3,
        "distanceM": 1000,
        "ascentM": 0,
        "descentM": 0,
        "gradePct": 0
      },
      {
        "km": 4,
        "distanceM": 1000,
        "ascentM": 2,
        "descentM": 3,
        "gradePct": -0.1
      },
      {
        "km": 5,
        "distanceM": 1000,
        "ascentM": 2,
        "descentM": 0,
        "gradePct": 0.2
      },
      {
        "km": 6,
        "distanceM": 1000,
        "ascentM": 0,
        "descentM": 2,
        "gradePct": -0.1
      },
      {
        "km": 7,
        "distanceM": 1000,
        "ascentM": 2,
        "descentM": 2,
        "gradePct": 0
      },
      {
        "km": 8,
        "distanceM": 1000,
        "ascentM": 0,
        "descentM": 2,
        "gradePct": -0.1
      },
      {
        "km": 9,
        "distanceM": 1000,
        "ascentM": 0,
        "descentM": 0,
        "gradePct": 0
      },
      {
        "km": 10,
        "distanceM": 1000,
        "ascentM": 3,
        "descentM": 5,
        "gradePct": -0.1
      },
      {
        "km": 11,
        "distanceM": 1000,
        "ascentM": 2,
        "descentM": 0,
        "gradePct": 0.2
      },
      {
        "km": 12,
        "distanceM": 1000,
        "ascentM": 3,
        "descentM": 2,
        "gradePct": 0.2
      },
      {
        "km": 13,
        "distanceM": 1000,
        "ascentM": 0,
        "descentM": 5,
        "gradePct": -0.5
      },
      {
        "km": 14,
        "distanceM": 1000,
        "ascentM": 2,
        "descentM": 2,
        "gradePct": 0
      },
      {
        "km": 15,
        "distanceM": 1000,
        "ascentM": 2,
        "descentM": 0,
        "gradePct": 0.2
      },
      {
        "km": 16,
        "distanceM": 1000,
        "ascentM": 0,
        "descentM": 2,
        "gradePct": -0.2
      },
      {
        "km": 17,
        "distanceM": 1000,
        "ascentM": 0,
        "descentM": 0,
        "gradePct": 0
      },
      {
        "km": 18,
        "distanceM": 1000,
        "ascentM": 3,
        "descentM": 2,
        "gradePct": 0.2
      },
      {
        "km": 19,
        "distanceM": 1000,
        "ascentM": 0,
        "descentM": 2,
        "gradePct": -0.1
      },
      {
        "km": 20,
        "distanceM": 1000,
        "ascentM": 2,
        "descentM": 3,
        "gradePct": -0.2
      },
      {
        "km": 21,
        "distanceM": 1000,
        "ascentM": 2,
        "descentM": 0,
        "gradePct": 0.2
      },
      {
        "km": 22,
        "distanceM": 1000,
        "ascentM": 0,
        "descentM": 0,
        "gradePct": 0
      },
      {
        "km": 23,
        "distanceM": 1000,
        "ascentM": 0,
        "descentM": 0,
        "gradePct": 0
      },
      {
        "km": 24,
        "distanceM": 1000,
        "ascentM": 2,
        "descentM": 0,
        "gradePct": 0.2
      },
      {
        "km": 25,
        "distanceM": 1000,
        "ascentM": 2,
        "descentM": 2,
        "gradePct": 0
      },
      {
        "km": 26,
        "distanceM": 1000,
        "ascentM": 3,
        "descentM": 0,
        "gradePct": 0.3
      },
      {
        "km": 27,
        "distanceM": 1000,
        "ascentM": 2,
        "descentM": 5,
        "gradePct": -0.4
      },
      {
        "km": 28,
        "distanceM": 1000,
        "ascentM": 0,
        "descentM": 0,
        "gradePct": 0
      },
      {
        "km": 29,
        "distanceM": 1000,
        "ascentM": 0,
        "descentM": 0,
        "gradePct": 0
      },
      {
        "km": 30,
        "distanceM": 1000,
        "ascentM": 0,
        "descentM": 2,
        "gradePct": -0.1
      },
      {
        "km": 31,
        "distanceM": 1000,
        "ascentM": 0,
        "descentM": 2,
        "gradePct": -0.2
      },
      {
        "km": 32,
        "distanceM": 1000,
        "ascentM": 0,
        "descentM": 0,
        "gradePct": 0
      },
      {
        "km": 33,
        "distanceM": 1000,
        "ascentM": 2,
        "descentM": 0,
        "gradePct": 0.2
      },
      {
        "km": 34,
        "distanceM": 1000,
        "ascentM": 0,
        "descentM": 0,
        "gradePct": 0
      },
      {
        "km": 35,
        "distanceM": 1000,
        "ascentM": 0,
        "descentM": 0,
        "gradePct": 0
      },
      {
        "km": 36,
        "distanceM": 1000,
        "ascentM": 0,
        "descentM": 0,
        "gradePct": 0
      },
      {
        "km": 37,
        "distanceM": 1000,
        "ascentM": 0,
        "descentM": 0,
        "gradePct": 0
      },
      {
        "km": 38,
        "distanceM": 1000,
        "ascentM": 2,
        "descentM": 2,
        "gradePct": 0
      },
      {
        "km": 39,
        "distanceM": 1000,
        "ascentM": 6,
        "descentM": 5,
        "gradePct": 0.1
      },
      {
        "km": 40,
        "distanceM": 1000,
        "ascentM": 2,
        "descentM": 0,
        "gradePct": 0.2
      },
      {
        "km": 41,
        "distanceM": 1000,
        "ascentM": 6,
        "descentM": 2,
        "gradePct": 0.4
      },
      {
        "km": 42,
        "distanceM": 1000,
        "ascentM": 2,
        "descentM": 7,
        "gradePct": -0.5
      },
      {
        "km": 43,
        "distanceM": 530,
        "ascentM": 3,
        "descentM": 2,
        "gradePct": 0.3
      }
    ],
    "hasElevation": true
  }
]
