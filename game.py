"""
game.py
Game holds the overall state machine (menu / playing / game_over),
the scrolling camera, procedurally generated lanes, and ties
Player + Lane + Obstacle together each frame.
"""
import pygame
from settings import (
    SCREEN_WIDTH, SCREEN_HEIGHT, GRID_COLS, GRID_ROWS, TILE_SIZE,
    BASE_CAMERA_CREEP, CAMERA_CREEP_PER_SCORE, CAMERA_CATCHUP_OFFSET,
    UI_TEXT, UI_SHADOW, MENU_BG, PLAYER_COLORS,
)
from player import Player
from lane import LaneFactory
from sound import SoundBank
from highscore import load_highscore, save_highscore

MENU, PLAYING, GAME_OVER = "menu", "playing", "game_over"
SKIN_NAMES = list(PLAYER_COLORS.keys())


class Game:
    def __init__(self, screen):
        self.screen = screen
        self.font_big = pygame.font.SysFont("arial", 56, bold=True)
        self.font_med = pygame.font.SysFont("arial", 32, bold=True)
        self.font_small = pygame.font.SysFont("arial", 22)

        self.sounds = SoundBank()
        self.highscore = load_highscore()
        self.skin_index = 0

        self.state = MENU
        self._reset()

    def _reset(self):
        """Fresh game state, used at the start and whenever the player restarts."""
        self.lane_factory = LaneFactory(GRID_COLS)
        self.lanes = {}
        for r in range(1, -6, -1):
            self.lanes[r] = self.lane_factory.make_lane(r)

        skin_color = PLAYER_COLORS[SKIN_NAMES[self.skin_index]]
        self.player = Player(col=GRID_COLS // 2, row=0, color=skin_color)
        self.camera_y = 0.0
        self.max_progress_row = 0     # smallest (furthest up) row reached so far
        self.death_reason = None
        self.game_over_timer = 0.0

    # ---- lane management ---------------------------------------------------
    def _ensure_lanes(self):
        """Generate new lanes above the camera and prune ones far below it."""
        top_row_needed = int(self.camera_y // TILE_SIZE) - 2
        min_generated = min(self.lanes.keys())
        while min_generated > top_row_needed:
            min_generated -= 1
            self.lanes[min_generated] = self.lane_factory.make_lane(min_generated)

        cutoff = int(self.camera_y // TILE_SIZE) + GRID_ROWS + 4
        for r in list(self.lanes.keys()):
            if r > cutoff:
                del self.lanes[r]

    # ---- input --------------------------------------------------------------
    def handle_event(self, event):
        if event.type != pygame.KEYDOWN:
            return
        if self.state == MENU:
            if event.key in (pygame.K_RETURN, pygame.K_SPACE):
                self.state = PLAYING
            elif event.key == pygame.K_TAB:
                self.skin_index = (self.skin_index + 1) % len(SKIN_NAMES)
                self._reset()
        elif self.state == GAME_OVER:
            if event.key in (pygame.K_RETURN, pygame.K_SPACE):
                self._reset()
                self.state = PLAYING
        elif self.state == PLAYING:
            self._handle_move_key(event.key)

    def _handle_move_key(self, key):
        moves = {
            pygame.K_UP: (0, -1), pygame.K_w: (0, -1),
            pygame.K_DOWN: (0, 1), pygame.K_s: (0, 1),
            pygame.K_LEFT: (-1, 0), pygame.K_a: (-1, 0),
            pygame.K_RIGHT: (1, 0), pygame.K_d: (1, 0),
        }
        if key not in moves:
            return
        dcol, drow = moves[key]
        new_col = self.player.col + dcol
        if 0 <= new_col < GRID_COLS:                 # clamp inside world horizontally
            if self.player.try_move(dcol, drow):
                self.sounds.play("hop")
                if drow < 0 and self.player.row < self.max_progress_row:
                    self.max_progress_row = self.player.row
                    self.sounds.play("score")

    # ---- update ---------------------------------------------------------------
    def update(self, dt):
        if self.state == PLAYING:
            self._update_playing(dt)
        elif self.state == GAME_OVER:
            self.game_over_timer += dt

    def _update_playing(self, dt):
        self._ensure_lanes()

        # Camera always creeps forward (up), and also snaps to keep pace with
        # the player - whichever pulls it further up wins. It never moves back.
        score = -self.max_progress_row
        creep = BASE_CAMERA_CREEP + score * CAMERA_CREEP_PER_SCORE
        target_cam = self.player.y - CAMERA_CATCHUP_OFFSET
        self.camera_y = min(self.camera_y - creep * dt, target_cam)

        for lane in self.lanes.values():
            lane.update(dt, self.lane_factory.world_width)

        self.player.update(dt)

        # Falling behind (off the bottom of the visible camera) is a death
        if self.player.y > self.camera_y + SCREEN_HEIGHT + TILE_SIZE:
            self._die("You fell behind!")
            return

        current_lane = self.lanes.get(self.player.row)
        if current_lane is None:
            return

        if current_lane.type == "road" and current_lane.car_collides(self.player.rect):
            self._die("Squashed by a car!")
            return

        if not self.player.hopping:
            if current_lane.type == "river":
                log = current_lane.log_at(self.player.x + TILE_SIZE / 2)
                if log is None:
                    self._die("Splash! You drowned!")
                    return
                self.player.on_log = log
            else:
                self.player.on_log = None

        # Being swept off the edge of the world while riding a log is also fatal
        if self.player.x < -TILE_SIZE or self.player.x > self.lane_factory.world_width:
            self._die("Swept off the map!")

    def _die(self, reason):
        self.death_reason = reason
        self.state = GAME_OVER
        self.game_over_timer = 0.0
        if "car" in reason.lower():
            self.sounds.play("crash")
        elif "drown" in reason.lower() or "splash" in reason.lower():
            self.sounds.play("splash")
        else:
            self.sounds.play("crash")

        score = -self.max_progress_row
        if score > self.highscore:
            self.highscore = score
            save_highscore(self.highscore)

    # ---- drawing ---------------------------------------------------------------
    def draw(self):
        if self.state == MENU:
            self._draw_menu()
        else:
            self._draw_world()
            if self.state == GAME_OVER:
                self._draw_game_over()
            self._draw_hud()

    def _draw_world(self):
        self.screen.fill((94, 173, 63))
        for row in sorted(self.lanes.keys()):
            self.lanes[row].draw(self.screen, int(self.camera_y), GRID_COLS)
        self.player.draw(self.screen, int(self.camera_y))

    def _draw_hud(self):
        score = -self.max_progress_row
        self._shadow_text(f"Score: {score}", self.font_med, 16, 10)
        self._shadow_text(f"Best: {self.highscore}", self.font_small, 16, 50)

    def _shadow_text(self, text, font, x, y):
        shadow = font.render(text, True, UI_SHADOW)
        main = font.render(text, True, UI_TEXT)
        self.screen.blit(shadow, (x + 2, y + 2))
        self.screen.blit(main, (x, y))

    def _draw_menu(self):
        self.screen.fill(MENU_BG)
        title = self.font_big.render("CROSSY ROAD", True, (255, 220, 80))
        self.screen.blit(title, title.get_rect(center=(SCREEN_WIDTH // 2, SCREEN_HEIGHT // 2 - 110)))

        subtitle = self.font_small.render("A tiny Python / Pygame clone", True, (200, 200, 200))
        self.screen.blit(subtitle, subtitle.get_rect(center=(SCREEN_WIDTH // 2, SCREEN_HEIGHT // 2 - 60)))

        prompt = self.font_med.render("Press ENTER or SPACE to start", True, UI_TEXT)
        self.screen.blit(prompt, prompt.get_rect(center=(SCREEN_WIDTH // 2, SCREEN_HEIGHT // 2 + 10)))

        controls = self.font_small.render("Move: Arrow Keys or WASD", True, (200, 200, 200))
        self.screen.blit(controls, controls.get_rect(center=(SCREEN_WIDTH // 2, SCREEN_HEIGHT // 2 + 55)))

        skin_txt = self.font_small.render(
            f"TAB to change skin: {SKIN_NAMES[self.skin_index]}", True, (200, 200, 200))
        self.screen.blit(skin_txt, skin_txt.get_rect(center=(SCREEN_WIDTH // 2, SCREEN_HEIGHT // 2 + 90)))

        # preview circle of the currently selected skin
        pygame.draw.circle(self.screen, PLAYER_COLORS[SKIN_NAMES[self.skin_index]],
                            (SCREEN_WIDTH // 2, SCREEN_HEIGHT // 2 + 130), 18)
        pygame.draw.circle(self.screen, (40, 40, 40),
                            (SCREEN_WIDTH // 2, SCREEN_HEIGHT // 2 + 130), 18, 2)

        best = self.font_small.render(f"Best score: {self.highscore}", True, (255, 220, 80))
        self.screen.blit(best, best.get_rect(center=(SCREEN_WIDTH // 2, SCREEN_HEIGHT // 2 + 175)))

    def _draw_game_over(self):
        overlay = pygame.Surface((SCREEN_WIDTH, SCREEN_HEIGHT), pygame.SRCALPHA)
        overlay.fill((0, 0, 0, 150))
        self.screen.blit(overlay, (0, 0))

        score = -self.max_progress_row
        title = self.font_big.render("GAME OVER", True, (240, 80, 70))
        self.screen.blit(title, title.get_rect(center=(SCREEN_WIDTH // 2, SCREEN_HEIGHT // 2 - 100)))

        if self.death_reason:
            reason = self.font_small.render(self.death_reason, True, (230, 230, 230))
            self.screen.blit(reason, reason.get_rect(center=(SCREEN_WIDTH // 2, SCREEN_HEIGHT // 2 - 55)))

        score_txt = self.font_med.render(f"Score: {score}", True, UI_TEXT)
        self.screen.blit(score_txt, score_txt.get_rect(center=(SCREEN_WIDTH // 2, SCREEN_HEIGHT // 2 - 5)))

        best_txt = self.font_med.render(f"Best: {self.highscore}", True, (255, 220, 80))
        self.screen.blit(best_txt, best_txt.get_rect(center=(SCREEN_WIDTH // 2, SCREEN_HEIGHT // 2 + 35)))

        if self.game_over_timer > 0.4:
            prompt = self.font_small.render("Press ENTER or SPACE to play again", True, (220, 220, 220))
            self.screen.blit(prompt, prompt.get_rect(center=(SCREEN_WIDTH // 2, SCREEN_HEIGHT // 2 + 90)))
