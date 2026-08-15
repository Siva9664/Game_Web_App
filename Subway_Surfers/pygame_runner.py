"""
Subway Surfers - Standalone Python Pygame Edition
Run this script directly with: python pygame_runner.py
"""

import sys
import random
import pygame

# Initialize Pygame
pygame.init()
pygame.font.init()

try:
    pygame.mixer.init()
except pygame.error:
    pass

# Display Config
SCREEN_WIDTH = 800
SCREEN_HEIGHT = 600
FPS = 60

title = "Subway Surfers - Python Edition"

screen = pygame.display.set_mode((SCREEN_WIDTH, SCREEN_HEIGHT))
pygame.display.set_caption(title)

clock = pygame.time.Clock()

# Colors
COLOR_BG = (20, 24, 38)
COLOR_TRACK = (35, 42, 64)
COLOR_LANE_LINE = (0, 240, 255)
COLOR_PLAYER = (255, 0, 110)
COLOR_TRAIN = (130, 40, 200)
COLOR_BARRIER = (255, 60, 60)
COLOR_COIN = (255, 215, 0)
COLOR_MAGNET = (0, 200, 255)
COLOR_BOARD = (50, 255, 126)
COLOR_TEXT = (255, 255, 255)
COLOR_HUD = (10, 15, 26, 200)

# Game Lanes
LANES = [230, 400, 570]
LANE_WIDTH = 140

# Fonts
FONT_LARGE = pygame.font.SysFont("Arial", 42, bold=True)
FONT_MEDIUM = pygame.font.SysFont("Arial", 28, bold=True)
FONT_SMALL = pygame.font.SysFont("Arial", 20)


class Player:

    def __init__(self):
        self.lane = 1
        self.x = LANES[self.lane]
        self.target_x = self.x

        self.y = 480
        self.base_y = 480

        self.width = 46
        self.height = 70

        self.normal_height = 70
        self.slide_height = 35

        # Physics
        self.vel_y = 0
        self.gravity = 1.2

        self.is_jumping = False
        self.is_sliding = False
        self.slide_timer = 0

        self.has_board = False
        self.has_magnet = False
        self.magnet_timer = 0

    def move_left(self):
        if self.lane > 0:
            self.lane -= 1
            self.target_x = LANES[self.lane]

    def move_right(self):
        if self.lane < 2:
            self.lane += 1
            self.target_x = LANES[self.lane]

    def jump(self):
        if not self.is_jumping:
            self.is_jumping = True
            self.vel_y = -18

            if self.is_sliding:
                self.is_sliding = False
                self.height = self.normal_height

    def slide(self):
        if not self.is_sliding:
            self.is_sliding = True
            self.slide_timer = 30
            self.height = self.slide_height

            if self.is_jumping:
                self.vel_y = 15

    def activate_board(self):
        self.has_board = True

    def update(self):

        # Smooth horizontal movement
        self.x += (self.target_x - self.x) * 0.25

        # Jump physics
        if self.is_jumping:
            self.y += self.vel_y
            self.vel_y += self.gravity

            if self.y >= self.base_y:
                self.y = self.base_y
                self.is_jumping = False
                self.vel_y = 0

        # Slide timer
        if self.is_sliding:
            self.slide_timer -= 1

            if self.slide_timer <= 0:
                self.is_sliding = False
                self.height = self.normal_height

        # Magnet timer
        if self.has_magnet:
            self.magnet_timer -= 1

            if self.magnet_timer <= 0:
                self.has_magnet = False

    def draw(self, surface):

        rect_y = self.y - self.height

        player_rect = pygame.Rect(
            int(self.x - self.width // 2),
            int(rect_y),
            self.width,
            self.height
        )

        # Shadow
        shadow_rect = pygame.Rect(
            int(self.x - 25),
            485,
            50,
            10
        )

        pygame.draw.ellipse(
            surface,
            (10, 12, 20),
            shadow_rect
        )

        # Hoverboard
        if self.has_board:
            board_rect = pygame.Rect(
                int(self.x - 30),
                int(rect_y + self.height - 5),
                60,
                10
            )

            pygame.draw.rect(
                surface,
                COLOR_BOARD,
                board_rect,
                border_radius=4
            )

        # Player body
        pygame.draw.rect(
            surface,
            COLOR_PLAYER,
            player_rect,
            border_radius=8
        )

        # Visor
        visor_rect = pygame.Rect(
            int(self.x - 15),
            int(rect_y + 10),
            30,
            10
        )

        pygame.draw.rect(
            surface,
            (255, 255, 255),
            visor_rect,
            border_radius=3
        )


class Obstacle:

    def __init__(self, obs_type, lane, speed):

        self.type = obs_type
        self.lane = lane

        self.x = LANES[lane]
        self.y = -100
        self.speed = speed

        if obs_type == "train":
            self.width = 110
            self.height = 160

        elif obs_type == "low_barrier":
            self.width = 100
            self.height = 40

        elif obs_type == "high_barrier":
            self.width = 100
            self.height = 90

        elif obs_type in ("coin", "magnet", "board"):
            self.width = 30
            self.height = 30

    def update(self):
        self.y += self.speed

    def draw(self, surface):

        rx = int(self.x - self.width // 2)
        ry = int(self.y)

        if self.type == "train":

            rect = pygame.Rect(
                rx,
                ry,
                self.width,
                self.height
            )

            pygame.draw.rect(
                surface,
                COLOR_TRAIN,
                rect,
                border_radius=6
            )

            pygame.draw.circle(
                surface,
                (255, 255, 200),
                (int(self.x - 30), ry + self.height - 20),
                12
            )

            pygame.draw.circle(
                surface,
                (255, 255, 200),
                (int(self.x + 30), ry + self.height - 20),
                12
            )

        elif self.type == "low_barrier":

            rect = pygame.Rect(
                rx,
                ry + 40,
                self.width,
                30
            )

            pygame.draw.rect(
                surface,
                COLOR_BARRIER,
                rect,
                border_radius=4
            )

            pygame.draw.line(
                surface,
                (255, 255, 255),
                (rx, ry + 40),
                (rx + self.width, ry + 70),
                4
            )

        elif self.type == "high_barrier":

            rect = pygame.Rect(
                rx,
                ry,
                self.width,
                50
            )

            pygame.draw.rect(
                surface,
                COLOR_BARRIER,
                rect,
                border_radius=4
            )

            # Legs
            pygame.draw.line(
                surface,
                COLOR_BARRIER,
                (rx + 10, ry + 50),
                (rx + 10, ry + 90),
                6
            )

            pygame.draw.line(
                surface,
                COLOR_BARRIER,
                (rx + self.width - 10, ry + 50),
                (rx + self.width - 10, ry + 90),
                6
            )

        elif self.type == "coin":

            pygame.draw.circle(
                surface,
                COLOR_COIN,
                (int(self.x), int(self.y + 15)),
                14
            )

            pygame.draw.circle(
                surface,
                (255, 255, 180),
                (int(self.x), int(self.y + 15)),
                8
            )

        elif self.type == "magnet":

            pygame.draw.rect(
                surface,
                COLOR_MAGNET,
                (rx, ry, 30, 30),
                border_radius=6
            )

        elif self.type == "board":

            pygame.draw.rect(
                surface,
                COLOR_BOARD,
                (rx, ry + 10, 40, 15),
                border_radius=5
            )


def run_game():

    player = Player()
    obstacles = []

    score = 0
    coins = 0

    multiplier = 1
    game_speed = 2.5

    spawn_timer = 0

    game_over = False
    paused = False

    while True:

        # Event Loop
        for event in pygame.event.get():

            if event.type == pygame.QUIT:
                pygame.quit()
                sys.exit()

            if event.type == pygame.KEYDOWN:

                if game_over:

                    if event.key in (
                        pygame.K_RETURN,
                        pygame.K_SPACE
                    ):
                        return run_game()

                else:

                    if event.key in (
                        pygame.K_LEFT,
                        pygame.K_a
                    ):
                        player.move_left()

                    elif event.key in (
                        pygame.K_RIGHT,
                        pygame.K_d
                    ):
                        player.move_right()

                    elif event.key in (
                        pygame.K_UP,
                        pygame.K_w
                    ):
                        player.jump()

                    elif event.key in (
                        pygame.K_DOWN,
                        pygame.K_s
                    ):
                        player.slide()

                    elif event.key == pygame.K_SPACE:
                        player.activate_board()

                    elif event.key == pygame.K_p:
                        paused = not paused

        # Game Update
        if not game_over and not paused:

            # Increase speed
            game_speed += 0.0003

            # Increase score
            score += int(1 * multiplier)

            # Update player
            player.update()

            # Spawn objects
            spawn_timer += 1

            if spawn_timer >= max(
                35,
                int(70 - game_speed * 2)
            ):

                spawn_timer = 0

                lane = random.randint(0, 2)

                item_type = random.choices(
                    [
                        "train",
                        "low_barrier",
                        "high_barrier",
                        "coin",
                        "magnet",
                        "board"
                    ],
                    weights=[
                        30,
                        25,
                        25,
                        50,
                        5,
                        5
                    ]
                )[0]

                obstacles.append(
                    Obstacle(
                        item_type,
                        lane,
                        game_speed
                    )
                )

            # Player collision rectangle
            player_rect = pygame.Rect(
                int(player.x - player.width // 2),
                int(player.y - player.height),
                player.width,
                player.height
            )

            # Update obstacles
            for obs in obstacles[:]:

                obs.update()

                # Magnet attraction
                if player.has_magnet and obs.type == "coin":

                    if abs(obs.y - player.y) < 250:

                        obs.x += (
                            player.x - obs.x
                        ) * 0.15

                        obs.y += (
                            player.y - obs.y
                        ) * 0.15

                obs_rect = pygame.Rect(
                    int(obs.x - obs.width // 2),
                    int(obs.y),
                    obs.width,
                    obs.height
                )

                # Collision
                if player_rect.colliderect(obs_rect):

                    if obs.type == "coin":

                        coins += 1
                        score += 50

                        obstacles.remove(obs)

                    elif obs.type == "magnet":

                        player.has_magnet = True
                        player.magnet_timer = 300

                        obstacles.remove(obs)

                    elif obs.type == "board":

                        player.has_board = True

                        obstacles.remove(obs)

                    elif obs.type == "low_barrier":

                        if player.is_jumping:

                            pass

                        elif player.has_board:

                            player.has_board = False
                            obstacles.remove(obs)

                        else:

                            game_over = True

                    elif obs.type == "high_barrier":

                        if player.is_sliding:

                            pass

                        elif player.has_board:

                            player.has_board = False
                            obstacles.remove(obs)

                        else:

                            game_over = True

                    elif obs.type == "train":

                        if player.has_board:

                            player.has_board = False
                            obstacles.remove(obs)

                        else:

                            game_over = True

                # Remove objects outside screen
                if obs.y > SCREEN_HEIGHT + 100:

                    if obs in obstacles:
                        obstacles.remove(obs)

        # ---------------- DRAWING ----------------

        screen.fill(COLOR_BG)

        # Track
        track_rect = pygame.Rect(
            150,
            0,
            500,
            SCREEN_HEIGHT
        )

        pygame.draw.rect(
            screen,
            COLOR_TRACK,
            track_rect
        )

        # Lane lines
        for x in [315, 485]:

            for y in range(
                0,
                SCREEN_HEIGHT,
                40
            ):

                offset_y = (
                    y + int(score * 2)
                ) % SCREEN_HEIGHT

                pygame.draw.line(
                    screen,
                    COLOR_LANE_LINE,
                    (x, offset_y),
                    (x, offset_y + 20),
                    2
                )

        # Obstacles
        for obs in obstacles:
            obs.draw(screen)

        # Player
        player.draw(screen)

        # HUD
        hud_surface = pygame.Surface(
            (SCREEN_WIDTH, 70),
            pygame.SRCALPHA
        )

        hud_surface.fill(COLOR_HUD)

        screen.blit(
            hud_surface,
            (0, 0)
        )

        score_text = FONT_MEDIUM.render(
            f"SCORE: {score}",
            True,
            COLOR_TEXT
        )

        coin_text = FONT_MEDIUM.render(
            f"COINS: {coins}",
            True,
            COLOR_COIN
        )

        screen.blit(
            score_text,
            (20, 18)
        )

        screen.blit(
            coin_text,
            (SCREEN_WIDTH - 200, 18)
        )

        if player.has_board:

            board_text = FONT_SMALL.render(
                "HOVERBOARD ACTIVE",
                True,
                COLOR_BOARD
            )

            screen.blit(
                board_text,
                (310, 22)
            )

        # Game Over
        if game_over:

            overlay = pygame.Surface(
                (SCREEN_WIDTH, SCREEN_HEIGHT),
                pygame.SRCALPHA
            )

            overlay.fill(
                (0, 0, 0, 200)
            )

            screen.blit(
                overlay,
                (0, 0)
            )

            go_title = FONT_LARGE.render(
                "GAME OVER",
                True,
                (255, 50, 80)
            )

            final_score = FONT_MEDIUM.render(
                f"Final Score: {score}  |  Coins: {coins}",
                True,
                COLOR_TEXT
            )

            restart_hint = FONT_MEDIUM.render(
                "Press ENTER or SPACE to Play Again",
                True,
                COLOR_LANE_LINE
            )

            screen.blit(
                go_title,
                (
                    SCREEN_WIDTH // 2
                    - go_title.get_width() // 2,
                    200
                )
            )

            screen.blit(
                final_score,
                (
                    SCREEN_WIDTH // 2
                    - final_score.get_width() // 2,
                    280
                )
            )

            screen.blit(
                restart_hint,
                (
                    SCREEN_WIDTH // 2
                    - restart_hint.get_width() // 2,
                    360
                )
            )

        pygame.display.flip()
        clock.tick(FPS)


if __name__ == "__main__":
    run_game()