
-- Rename Colombia boards to match Miami's workflow phases exactly
-- Col-Kickoff stays the same (sort_order 1, has 25 tasks)

-- Rename existing boards to match Miami naming
UPDATE boards SET name = 'Col-Assets', sort_order = 3 WHERE id = '7a2dce87-0795-42f1-b9e9-2c55c4df57a8';
UPDATE boards SET name = 'Col-Translation', sort_order = 4 WHERE id = 'e63bbca5-4e0f-4137-b425-814ef8eff389';
UPDATE boards SET name = 'Col-Adapting', sort_order = 5 WHERE id = 'd904ad33-f752-4695-a203-2255357145e2';
UPDATE boards SET name = 'Col-VoiceTests', sort_order = 6 WHERE id = '11752bb0-b678-4da9-909e-897f6112227f';
UPDATE boards SET name = 'Col-Premix', sort_order = 8 WHERE id = '9f00b1c8-2227-4abc-a2e4-1bdfc3ed6c56';
UPDATE boards SET name = 'Col-QC Premix', sort_order = 9 WHERE id = '3fa90169-b58b-44bc-8075-aebe1b6f7931';
UPDATE boards SET name = 'Col-Recording', sort_order = 7 WHERE id = 'f37c9205-f5c0-49c9-bb4a-3da495d9434a';
UPDATE boards SET name = 'Col-QC Retakes', sort_order = 11 WHERE id = '69c9d8a7-ea25-43d4-893f-9bb5808c4195';
UPDATE boards SET name = 'Col-Retakes', sort_order = 10 WHERE id = '13a38fa3-0cf1-47e7-936d-4fb6c6d5fb0e';
UPDATE boards SET name = 'Col-Mix', sort_order = 12 WHERE id = '70ed0fa5-0b3c-486a-b90f-7a3a037017c5';
UPDATE boards SET name = 'Col-Qc Mix', sort_order = 13 WHERE id = '813d9c35-d69f-4e96-a51e-b8ba5468effa';
UPDATE boards SET name = 'Col-MixRetakes', sort_order = 14 WHERE id = '1052238e-e545-46f5-9284-337f5ddbd5f2';
UPDATE boards SET name = 'Col-Deliveries', sort_order = 15 WHERE id = '6f110e9f-8de2-4054-987a-b511c4f44297';

-- Create the missing Col-Client Retakes board (Miami has it at sort_order 2)
INSERT INTO boards (workspace_id, name, sort_order, is_hq)
VALUES ('11111111-1111-1111-1111-111111111111', 'Col-Client Retakes', 2, false);
