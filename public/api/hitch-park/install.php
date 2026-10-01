<?php
// POST (header X-Verify-Token) → {tables: [...]}
// Creates the tables from schema.sql. Every statement is CREATE TABLE IF
// NOT EXISTS, so running it again is harmless: the deploy (prod-ci.yml)
// calls it after every upload. New columns need an ALTER by hand.
require __DIR__ . '/lib.php';
hp_method('POST');
$want = (string)(hp_config()['verify_token'] ?? '');
if ($want === '' || $want === 'CHANGE-ME-TOO' || !hash_equals($want, (string)hp_header('X-Verify-Token'))) hp_fail(403, 'forbidden');

$sql = preg_replace('/--[^\n]*/', '', (string)file_get_contents(__DIR__ . '/schema.sql'));
foreach (array_filter(array_map('trim', explode(';', $sql))) as $stmt) hp_db()->exec($stmt);
hp_send(['tables' => hp_q("SHOW TABLES LIKE 'hp\\_%'")->fetchAll(PDO::FETCH_COLUMN)]);
