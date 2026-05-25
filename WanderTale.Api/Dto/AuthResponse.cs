namespace WanderTale.Dto;

public record AuthResponse(
    string Token,
    string RefreshToken,
    DateTime AccessTokenExpiresAt,
    string Email,
    string Name
);
