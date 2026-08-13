"""
obstacle.py
Obstacle represents anything that moves horizontally along a lane:
Cars (deadly, found on roads) and Logs (rideable, found on rivers).
Both share the same movement/wrap-around logic; only their drawing and
gameplay meaning differ.
"""
import pygame
from settings import TILE_SIZE, LOG_BROWN, LOG_BROWN_DARK


class Obstacle:
    """A single moving object confined to one lane."""

    def __init__(self, x, row, width_tiles, speed, direction, kind, color):
        self.width = width_tiles * TILE_SIZE
        self.height = TILE_SIZE
        self.x = x                       # world-space pixel x (left edge)
        self.row = row                   # logical row (grid y)
        self.speed = speed               # px/sec, always positive
        self.direction = direction       # 1 = moving right, -1 = moving left
        self.kind = kind                 # "car" or "log"
        self.color = color

    @property
    def rect(self):
        """Current collision rectangle in world space."""
        y = self.row * TILE_SIZE
        return pygame.Rect(int(self.x), y, self.width, self.height)

    def update(self, dt, world_width):
        """Advance position and wrap around so the lane loops forever."""
        self.x += self.speed * self.direction * dt
        if self.direction > 0 and self.x > world_width:
            self.x = -self.width
        elif self.direction < 0 and self.x < -self.width:
            self.x = world_width

    def draw(self, surface, camera_y):
        y = self.row * TILE_SIZE - camera_y
        rect = pygame.Rect(int(self.x), int(y), self.width, self.height)
        if self.kind == "car":
            self._draw_car(surface, rect)
        else:
            self._draw_log(surface, rect)

    def _draw_car(self, surface, rect):
        body = rect.inflate(-6, -14)
        pygame.draw.rect(surface, self.color, body, border_radius=8)
        pygame.draw.rect(surface, (20, 20, 20), body, width=2, border_radius=8)
        # windows: a rectangle placed toward the direction of travel
        window_w = max(6, body.width // 3)
        wx = body.right - window_w - 6 if self.direction > 0 else body.left + 6
        window = pygame.Rect(wx, body.y + 6, window_w, body.height - 12)
        pygame.draw.rect(surface, (200, 230, 255), window, border_radius=4)

    def _draw_log(self, surface, rect):
        body = rect.inflate(-4, -18)
        pygame.draw.rect(surface, LOG_BROWN, body, border_radius=10)
        pygame.draw.rect(surface, LOG_BROWN_DARK, body, width=3, border_radius=10)
        # a couple of "wood ring" details for texture
        for i in range(1, 3):
            cx = body.x + body.width * i // 3
            pygame.draw.circle(surface, LOG_BROWN_DARK, (cx, body.centery), 5, 1)
