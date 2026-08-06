-- Seed Predefined Milestones for public.milestones
-- Standard Child Development Milestones across Cognitive, Motor Skills, Language, and Social-Emotional

INSERT INTO public.milestones (title, description, target_age_months, category) VALUES
-- 2 Months
('Social Smile', 'Smiles at people and looks at parents when talked to.', 2, 'Social-Emotional'),
('Coos and Makes Sounds', 'Makes vocal sounds like ooh and aah.', 2, 'Language'),
('Holds Head Up', 'Holds head up when lying on tummy for brief moments.', 2, 'Motor Skills'),
('Tracks Objects', 'Follows moving objects with eyes from side to side.', 2, 'Cognitive'),

-- 4 Months
('Chuckles and Laughs', 'Giggles or laughs out loud when tickled or played with.', 4, 'Social-Emotional'),
('Babbles', 'Makes sounds like bba, dda, or mma.', 4, 'Language'),
('Pushes Up on Arms', 'Pushes up onto elbows or hands when lying on tummy.', 4, 'Motor Skills'),
('Reaches for Toys', 'Uses hands to reach for objects and brings objects to mouth.', 4, 'Cognitive'),

-- 6 Months
('Recognizes Familiar Faces', 'Knows familiar people and begins to react to strangers.', 6, 'Social-Emotional'),
('Responds to Sounds with Sounds', 'Takes turns making sounds with parents.', 6, 'Language'),
('Rolls Over', 'Rolls over in both directions (front to back, back to front).', 6, 'Motor Skills'),
('Passes Things from Hand to Hand', 'Transfers toys or blocks from one hand to the other.', 6, 'Cognitive'),

-- 9 Months
('Shows Stranger Anxiety', 'Clings to familiar adults and may be afraid of strangers.', 9, 'Social-Emotional'),
('Understands "No"', 'Responds when spoken to and copies sounds and gestures.', 9, 'Language'),
('Sits Without Support', 'Sits independently without leaning on hands.', 9, 'Motor Skills'),
('Plays Peek-a-boo', 'Looks for objects that are hidden out of sight.', 9, 'Cognitive'),

-- 12 Months
('Plays Interactive Games', 'Plays games like pat-a-cake or waves bye-bye.', 12, 'Social-Emotional'),
('Says First Words', 'Says simple words like mama, dada, or hi.', 12, 'Language'),
('Pulls to Stand & Walks holding furniture', 'Cruises along furniture or takes first unassisted steps.', 12, 'Motor Skills'),
('Explores Objects in Various Ways', 'Shakes, bangs, or throws objects to see what happens.', 12, 'Cognitive'),

-- 18 Months
('Shows Affection', 'Hugs family members or hands items to others in play.', 18, 'Social-Emotional'),
('Says 10 to 20 Words', 'Uses several single words correctly to ask for things.', 18, 'Language'),
('Walks Independently', 'Walks alone steadily without holding hands.', 18, 'Motor Skills'),
('Scribbles Spontaneously', 'Uses crayons or markers to scribble on paper.', 18, 'Cognitive'),

-- 24 Months (2 Years)
('Copies Others', 'Imitates actions of adults and older children during play.', 24, 'Social-Emotional'),
('Combines 2-4 Words', 'Puts two words together like "more milk" or "big dog".', 24, 'Language'),
('Kicks a Ball & Runs', 'Runs easily and kicks a small ball forward.', 24, 'Motor Skills'),
('Sorts Shapes and Colors', 'Sorts objects by shape or color and completes simple puzzles.', 24, 'Cognitive'),

-- 36 Months (3 Years)
('Takes Turns in Games', 'Understands the concept of mine and theirs, shares with prompt.', 36, 'Social-Emotional'),
('Speaks in 3-5 Word Sentences', 'Carries on a conversation using 2-3 sentences at a time.', 36, 'Language'),
('Climbs and Rides Tricycle', 'Climbs stairs easily alternating feet and pedals a tricycle.', 36, 'Motor Skills'),
('Completes 3-4 Piece Puzzles', 'Understands what "same" and "different" mean.', 36, 'Cognitive'),

-- 48 Months (4 Years)
('Enjoys Playing with Other Children', 'Cooperates with other children in group play and roleplay.', 48, 'Social-Emotional'),
('Tells Simple Stories', 'Sings songs or recites poems from memory.', 48, 'Language'),
('Hops and Stands on One Foot', 'Hops on one foot for up to 2 seconds.', 48, 'Motor Skills'),
('Names Colors and Numbers', 'Understands counting and names several basic colors.', 48, 'Cognitive'),

-- 60 Months (5 Years)
('Wants to Please Friends', 'Shows more independence and likes to sing, dance, and act.', 60, 'Social-Emotional'),
('Speaks Very Clearly', 'Uses full grammatical sentences and talks about future events.', 60, 'Language'),
('Swings and Climbs', 'Skips, somersaults, and uses playground swings independently.', 60, 'Motor Skills'),
('Counts 10 or More Objects', 'Draws a person with at least 6 body parts.', 60, 'Cognitive')

ON CONFLICT DO NOTHING;
