"""
main.py
Entry point: sets up the Pygame window and runs the main loop, delegating
all game-state logic to Game. Run with: python main.py
"""
import sys
import pygame
from settings import SCREEN_WIDTH, SCREEN_HEIGHT, FPS
from game import Game


def main():
    pygame.init()
    screen = pygame.display.set_mode((SCREEN_WIDTH, SCREEN_HEIGHT))
    pygame.display.set_caption("Crossy Road - Pygame Edition")
    clock = pygame.time.Clock()

    game = Game(screen)

    running = True
    while running:
        dt = clock.tick(FPS) / 1000.0  # delta time in seconds

        for event in pygame.event.get():
            if event.type == pygame.QUIT:
                running = False
            else:
                game.handle_event(event)

        game.update(dt)
        game.draw()
        pygame.display.flip()

    pygame.quit()
    sys.exit()


if __name__ == "__main__":
    main()
