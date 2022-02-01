CREATE TABLE deletions(
    id BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    update_at TIMESTAMP NOT NULL DEFAULT NOW() ON UPDATE NOW(),
    comment VARCHAR(255) NOT NULL
);