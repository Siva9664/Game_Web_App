class ScoringService:
    @staticmethod
    def calculate_draw_guess_score(
        difficulty: str,
        confidence: float,
        duration_seconds: int,
        attempts: int
    ) -> int:
        difficulty_multipliers = {
            "EASY": 1.0,
            "MEDIUM": 1.5,
            "HARD": 2.0
        }
        
        base_score = 500
        mult = difficulty_multipliers.get(difficulty.upper(), 1.0)
        
        # Time penalty: lose 2 points per second after 10s, max 200 pt penalty
        time_penalty = min(200, max(0, (duration_seconds - 10) * 2))
        
        # Attempt penalty: 50 points per extra attempt
        attempt_penalty = max(0, (attempts - 1) * 50)
        
        raw_score = (base_score * mult * confidence) - time_penalty - attempt_penalty
        final_score = int(max(50, raw_score))
        return final_score
