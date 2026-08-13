"""
lane.py
Lane represents one horizontal strip of the world: grass, road, or river.
LaneFactory procedurally generates new lanes on demand, with obstacle
density and speed that scale with how far the player has travelled.
"""
import random
import pygame
from settings import (
    TILE_SIZE, GRASS_GREEN, GRASS_GREEN_DARK, ROAD_GRAY, ROAD_LINE,
    RIVER_BLUE, RIVER_BLUE_DARK, LOG_BROWN, CAR_COLORS,
    SAFE_START_ROWS, BASE_CAR_SPEED, BASE_LOG_SPEED, DIFFICULTY_ROW_SCALE,
)
from obstacle import Obstacle


class Lane:
    """One horizontal strip of the world at a fixed grid row."""

    def __init__(self, row, lane_type):
        self.row = row
        self.type = lane_type              # "grass", "road", or "river"
        self.obstacles = []                # Car/Log obstacles; empty for grass

    def update(self, dt, world_width):
        for obs in self.obstacles:
            obs.update(dt, world_width)

    def draw(self, surface, camera_y, world_cols):
        y = self.row * TILE_SIZE - camera_y
        rect = pygame.Rect(0, int(y), world_cols * TILE_SIZE, TILE_SIZE)

        if self.type == "grass":
            color = GRASS_GREEN_DARK if self.row % 2 == 0 else GRASS_GREEN
            pygame.draw.rect(surface, color, rect)
        elif self.type == "road":
            pygame.draw.rect(surface, ROAD_GRAY, rect)
            # dashed lane markings running across the strip
            dash_w, gap = 26, 18
            dx = 0
            while dx < rect.width:
                dash_rect = pygame.Rect(dx, rect.y + TILE_SIZE // 2 - 3, dash_w, 6)
                pygame.draw.rect(surface, ROAD_LINE, dash_rect)
                dx += dash_w + gap
        elif self.type == "river":
            color = RIVER_BLUE_DARK if self.row % 2 == 0 else RIVER_BLUE
            pygame.draw.rect(surface, color, rect)

        for obs in self.obstacles:
            obs.draw(surface, camera_y)

    def log_at(self, world_x):
        """Return the log obstacle under a given world-space x, or None."""
        probe_y = self.row * TILE_SIZE + TILE_SIZE // 2
        for obs in self.obstacles:
            if obs.kind == "log" and obs.rect.collidepoint(world_x, probe_y):
                return obs
        return None

    def car_collides(self, player_rect):
        for obs in self.obstacles:
            if obs.kind == "car" and obs.rect.colliderect(player_rect):
                return True
        return False


class LaneFactory:
    """Generates new lanes on demand, with difficulty scaling by depth."""

    def __init__(self, world_cols):
        self.world_cols = world_cols
        self.world_width = world_cols * TILE_SIZE
        self.last_types = []       # remembers recent lane types to avoid bad streaks

    def difficulty(self, row):
        """0 near the start, grows the further up (more negative) the row is."""
        depth = max(0, -row - SAFE_START_ROWS)
        return depth * DIFFICULTY_ROW_SCALE

    def make_lane(self, row):
        # Guaranteed safe grass strip right after spawn so players get their bearings
        if row > -SAFE_START_ROWS:
            return Lane(row, "grass")

        diff = self.difficulty(row)
        weights = {
            "grass": max(0.18, 0.4 - diff * 0.5),
            "road": 0.35 + diff * 0.3,
            "river": 0.25 + diff * 0.25,
        }
        choices, probs = zip(*weights.items())
        lane_type = random.choices(choices, weights=probs, k=1)[0]

        # Avoid three punishing lanes of the same hazard type in a row
        if len(self.last_types) >= 2 and self.last_types[-1] == self.last_types[-2] == lane_type and lane_type != "grass":
            lane_type = "grass"

        self.last_types.append(lane_type)
        self.last_types = self.last_types[-3:]

        if lane_type == "grass":
            return Lane(row, "grass")
        elif lane_type == "road":
            return self._road_lane(row, diff)
        else:
            return self._river_lane(row, diff)

    def _road_lane(self, row, diff):
        lane = Lane(row, "road")
        direction = random.choice([-1, 1])
        speed = min(BASE_CAR_SPEED + diff * 220 + random.uniform(-15, 25), 320)
        # more cars as difficulty rises, but gaps stay wide enough to cross
        gap_tiles = max(3, random.randint(4, 6) - int(diff * 4))
        x = random.uniform(0, self.world_width)
        for _ in range(max(2, self.world_cols // gap_tiles)):
            color = random.choice(CAR_COLORS)
            lane.obstacles.append(Obstacle(x, row, 1, speed, direction, "car", color))
            x = (x + gap_tiles * TILE_SIZE) % self.world_width
        return lane

    def _river_lane(self, row, diff):
        lane = Lane(row, "river")
        direction = random.choice([-1, 1])
        speed = min(BASE_LOG_SPEED + diff * 150 + random.uniform(-10, 15), 220)
        log_len = random.choice([2, 3])
        gap_tiles = max(2, random.randint(3, 4) - int(diff * 3))
        x = random.uniform(0, self.world_width)
        for _ in range(max(2, self.world_cols // (gap_tiles + log_len))):
            lane.obstacles.append(Obstacle(x, row, log_len, speed, direction, "log", LOG_BROWN))
            x = (x + (log_len + gap_tiles) * TILE_SIZE) % self.world_width
        return lane
