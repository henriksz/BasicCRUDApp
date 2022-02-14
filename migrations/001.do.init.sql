CREATE TABLE deletions(
    id BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    update_at TIMESTAMP NOT NULL DEFAULT NOW() ON UPDATE NOW(),
    comment VARCHAR(255) NOT NULL
);

CREATE TABLE items(
    id BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
    deletion_id BIGINT,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW() ON UPDATE NOW(),
    name VARCHAR(64) NOT NULL UNIQUE,
    total_count INT UNSIGNED NOT NULL DEFAULT 0,
    FOREIGN KEY (deletion_id) REFERENCES deletions (id) ON DELETE SET NULL
);

CREATE TABLE item_assignments(
    id BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
    item_id BIGINT NOT NULL,
    assigned_count INT NOT NULL,
    FOREIGN KEY (item_id) REFERENCES items (id)
);


CREATE FUNCTION AVAIL_ITEMS_COUNT(item_id BIGINT)
RETURNS INT
BEGIN
    DECLARE total_item_count BIGINT;
    DECLARE assigned_item_count BIGINT;

    SELECT total_count INTO total_item_count
        FROM items WHERE id = item_id;

    SELECT COALESCE(SUM(assigned_count), 0) INTO assigned_item_count
        FROM item_assignments
        WHERE item_assignments.item_id = item_id;

    RETURN total_item_count - assigned_item_count;
END;


CREATE PROCEDURE CHECK_ITEM_ASSIGNMENT_COUNT(IN item_id BIGINT)
BEGIN
    IF (AVAIL_ITEMS_COUNT(item_id) < 0)
    THEN
        SIGNAL SQLSTATE '50001'
            SET MESSAGE_TEXT = "Assigned item count larger than available item count";
    END IF;
END;        

CREATE TRIGGER item_assignment_too_high
AFTER INSERT ON item_assignments
FOR EACH ROW
BEGIN
    CALL CHECK_ITEM_ASSIGNMENT_COUNT(NEW.item_id);
END;