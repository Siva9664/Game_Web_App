"""
player.py
Player-controlled character: grid-based hopping movement, log-riding
while on rivers, and the collision rectangle used against cars/logs.
"""
import pygame
from settings import TILE_SIZE, HOP_DURATION, PLAYER_OUTLINE


class Player:
    def __init__(self, col, row, color=(250, 250, 250)):
        self.col = col                  # logical grid column (float; logs push it)
        self.row = row                  # logical grid row (int; decreases going "up")
        self.color = color

        self.x = col * TILE_SIZE        # world-space pixel position (top-left)
        self.y = row * TILE_SIZE

        self.start_x = self.x
        self.start_y = self.y
        self.target_x = self.x
        self.target_y = self.y

        self.hopping = False
        self.hop_t = 0.0
        self.facing = "up"

        self.on_log = None              # Obstacle currently riding, if any

    @property
    def rect(self):
        # a slightly shrunk hitbox feels fairer than a full tile
        return pygame.Rect(int(self.x) + 10, int(self.y) + 10, TILE_SIZE - 20, TILE_SIZE - 20)

    def try_move(self, dcol, drow):
        """Queue a one-tile hop if the player isn't already mid-hop."""
        if self.hopping:
            return False
        self.col += dcol
        self.row += drow
        self.start_x, self.start_y = self.x, self.y
        self.target_x = self.col * TILE_SIZE
        self.target_y = self.row * TILE_SIZE
        self.hopping = True
        self.hop_t = 0.0
        if drow < 0:
            self.facing = "up"
        elif drow > 0:
            self.facing = "down"
        elif dcol < 0:
            self.facing = "left"
        else:
            self.facing = "right"
        return True

    def update(self, dt):
        if self.hopping:
            self.hop_t += dt / HOP_DURATION
            t = min(1.0, self.hop_t)
            eased = 1 - (1 - t) * (1 - t)   # ease-out gives a snappy hop feel
            self.x = self.start_x + (self.target_x - self.start_x) * eased
            self.y = self.start_y + (self.target_y - self.start_y) * eased
            if t >= 1.0:
                self.hopping = False
                self.x, self.y = self.target_x, self.target_y

        # Riding a log: drift with it horizontally even between hops
        if self.on_log is not None and not self.hopping:
            self.x += self.on_log.speed * self.on_log.direction * dt
            self.target_x = self.x
            self.col = self.x / TILE_SIZE

    @property
    def hop_offset(self):
        """Small vertical 'bounce' during a hop, purely visual (parabola)."""
        if not self.hopping:
            return 0
        t = min(1.0, self.hop_t)
        return -int(14 * (4 * t * (1 - t)))

    def draw(self, surface, camera_y):
        y = self.y - camera_y + self.hop_offset
        cx = int(self.x + TILE_SIZE / 2)
        cy = int(y + TILE_SIZE / 2)

        # shadow anchors the character to the ground during a hop
        shadow_y = int(self.y - camera_y + TILE_SIZE - 10)
        shadow = pygame.Surface((32, 10), pygame.SRCALPHA)
        pygame.draw.ellipse(shadow, (0, 0, 0, 90), shadow.get_rect())
        surface.blit(shadow, (cx - 16, shadow_y))

        body_radius = 20
        pygame.draw.circle(surface, self.color, (cx, cy), body_radius)
        pygame.draw.circle(surface, PLAYER_OUTLINE, (cx, cy), body_radius, 3)

        # little directional marker so the facing direction is readable
        offsets = {"up": (0, -body_radius), "down": (0, body_radius),
                   "left": (-body_radius, 0), "right": (body_radius, 0)}
        ox, oy = offsets[self.facing]
        pygame.draw.circle(surface, (250, 190, 60), (cx + ox // 2, cy + oy // 2), 6)
