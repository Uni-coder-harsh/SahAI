import math

def calculate_variance(alpha: float, beta: float) -> float:
    """
    Calculates the variance of a Beta distribution.
    Var[K] = (alpha * beta) / ((alpha + beta)^2 * (alpha + beta + 1))
    """
    total = alpha + beta
    denom = (total ** 2) * (total + 1.0)
    if denom == 0:
        return 0.0
    return (alpha * beta) / denom

def apply_ebbinghaus_decay(alpha: float, time_delta_days: float, decay_rate: float) -> float:
    """
    Decays the alpha parameter back toward 1.0 (uninformed prior) based on
    the Ebbinghaus forgetting curve:
    alpha_decayed = 1.0 + (alpha - 1.0) * e^(-decay_rate * t)
    """
    if time_delta_days <= 0:
        return alpha
    decayed = 1.0 + (alpha - 1.0) * math.exp(-decay_rate * time_delta_days)
    return max(1.0, decayed)

def calculate_expected_mastery(alpha: float, beta: float) -> float:
    """
    E[K] = alpha / (alpha + beta)
    """
    total = alpha + beta
    if total == 0:
        return 0.5
    return alpha / total

def process_cognitive_update(
    prior_alpha: float,
    prior_beta: float,
    last_practiced_days: float,
    decay_rate: float,
    success: bool,
    behavioral_flags: list
) -> tuple:
    """
    Performs Ebbinghaus decay and applies the Bayesian update based on success/failure and behavior.
    Returns (new_alpha, new_beta, expected_mastery)
    """
    # 1. Apply Ebbinghaus decay
    decayed_alpha = apply_ebbinghaus_decay(prior_alpha, last_practiced_days, decay_rate)
    decayed_beta = prior_beta  # Typically beta (mistakes/failures) doesn't decay down in the same way, keeping error history

    # 2. Apply behavior-driven modifiers
    alpha_modifier = 0.0
    beta_modifier = 0.0

    if "COPY_PASTE_PRONE" in behavioral_flags:
        # High likelihood of dependencies on external code: penalize understanding
        beta_modifier += 1.5
    
    if success:
        alpha_modifier += 1.0
    else:
        beta_modifier += 1.0

    # Calculate final updated parameters
    new_alpha = decayed_alpha + alpha_modifier
    new_beta = decayed_beta + beta_modifier
    expected_mastery = calculate_expected_mastery(new_alpha, new_beta)

    return new_alpha, new_beta, expected_mastery
