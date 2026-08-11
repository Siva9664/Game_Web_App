import pytest
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

def test_health_endpoint():
    response = client.get("/api/v1/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "healthy"

def test_list_games_endpoint():
    response = client.get("/api/v1/games")
    assert response.status_code == 200
    games = response.json()
    assert isinstance(games, list)
    assert len(games) >= 6
    # Ensure Draw & Guess is present
    draw_guess = next((g for g in games if g["id"] == "draw-guess"), None)
    assert draw_guess is not None
    assert draw_guess["name"] == "Draw & Guess"

def test_draw_guess_start_and_guess():
    # 1. Start game
    start_res = client.post("/api/v1/draw-guess/start", json={"difficulty": "EASY"})
    assert start_res.status_code == 200
    data = start_res.json()
    assert "game_id" in data
    assert "target_word" in data
    game_id = data["game_id"]

    # 2. Submit guess (mock base64 image)
    dummy_img = "iVBORw0KGgoAAAANSU5EUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg=="
    guess_res = client.post(f"/api/v1/draw-guess/{game_id}/guess", json={"image_base64": dummy_img})
    assert guess_res.status_code == 200
    result = guess_res.json()
    assert result["game_id"] == game_id
    assert "is_correct" in result
    assert result["score"] >= 0

def test_leaderboard_endpoint():
    response = client.get("/api/v1/scores/leaderboard")
    assert response.status_code == 200
    assert isinstance(response.json(), list)
