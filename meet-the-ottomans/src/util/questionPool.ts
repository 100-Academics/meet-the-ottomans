export type QuestionEntry = {
    question: string;
    answer: string;
};

type IndexedQuestionEntry = {
    0: string;
    1: string;
};

type LegacyQuestionEntry =
    | string
    | QuestionEntry
    | IndexedQuestionEntry;

export type MultipleChoiceQuestion = {
    timePeriod: number;
    questionId: number;
    question: string;
    correctAnswer: string;
    choices: string[];
};

export class questionPool{

    // map: timePeriod -> (questionId -> questionText)
    // time periods are:
    // 0: N/A
    // 1: 1200-1300
    // 2: 1400-1500
    // 3: 1500-1700
    // 4: 1700-1900
    // 5: 1900-1945
    // 6: 1945-2000
    // 7: 2000-2026
    // 8: ∞
    private questions: Record<number, Record<number, LegacyQuestionEntry>> = {
        0: {
            // N/A
            0: { question: "How are you here?", answer: "Begone" }, // questions should be formatted like this
            1: { question: "You shouldn't see this", answer: "My bad man" },
            2: { question: "Your end is nigh.", answer: "GET OUT" }
        },

        1: { // 1200-1300
 0: { question: "What Mongol leader united the steppe nomads and launched conquests across Eurasia in the early 13th century?", answer: "Genghis Khan (Temujin)" },
            1: { question: "What Islamic empire dominated trade across the Middle East and North Africa during the 1200s, with Baghdad as its capital?", answer: "The Abbasid Caliphate" },
            2: { question: "What series of religiously-motivated military campaigns did European Christians wage to reclaim the Holy Land during this period?", answer: "The Crusades" },
            3: { question: "What Mongol destruction of Baghdad in 1258 effectively ended which caliphate?", answer: "The Abbasid Caliphate" },
            4: { question: "What trade network connected East Asia, South Asia, the Middle East, and East Africa during the 1200s?", answer: "The Indian Ocean trade network" },
            5: { question: "What Mali ruler made a famous pilgrimage to Mecca in 1324, showcasing West African wealth?", answer: "Mansa Musa (note: pilgrimage was 1324, just after this period but his reign began ~1280s)" },
            6: { question: "What Mongol successor states divided the empire after Genghis Khan's death?", answer: "The four khanates (Golden Horde, Ilkhanate, Chagatai Khanate, Yuan Dynasty)" },
            7: { question: "What document signed in 1215 limited the English king's power and laid groundwork for constitutional government?", answer: "The Magna Carta" },
            8: { question: "What disease, spread partly along Mongol trade routes, would devastate Eurasia in the mid-1300s?", answer: "The Black Death (bubonic plague)" },
            9: { question: "What East African city-states thrived on Indian Ocean trade during the 1200s?", answer: "Swahili Coast city-states (e.g., Kilwa, Mombasa, Zanzibar)" },
            10: { question: "What religion spread rapidly through Southeast Asia via Indian Ocean trade merchants during the 1200s?", answer: "Islam" },
            11: { question: "What Mongol military innovation allowed them to defeat sedentary armies across Eurasia?", answer: "Highly mobile cavalry, composite bows, psychological terror, and adaptable siege warfare" },
            12: { question: "What Chinese dynasty ruled during the early Mongol invasions before being conquered by Kublai Khan?", answer: "The Song Dynasty" },
            13: { question: "What term describes the relative peace and stability across Mongol-controlled trade routes in the 13th century?", answer: "Pax Mongolica" },
            14: { question: "What Hindu-Buddhist empire dominated Southeast Asia and built Angkor Wat in modern-day Cambodia?", answer: "The Khmer Empire" },
            15: { question: "What system did the Mongols use to rapidly transmit messages across their vast empire?", answer: "The Yam (postal relay station system)" },
            16: { question: "What West African empire was the dominant power in the Saharan gold-salt trade during the 1200s?", answer: "The Mali Empire" },
            17: { question: "What Japanese military class rose to prominence during the 1100s–1200s as the emperor's power weakened?", answer: "The samurai (under the shogunate system)" },
            18: { question: "What Christian kingdom in Ethiopia maintained trade and diplomatic ties with the broader Indian Ocean world in the 1200s?", answer: "The Zagwe Dynasty (Ethiopia)" },
            19: { question: "What technological innovations did the Mongols adopt from conquered peoples to enhance their empire?", answer: "Gunpowder weapons, siege engines, paper money, and administrative bureaucracy" }
        },

        2: { // 1400-1500
        0: { question: "What Chinese admiral led massive treasure voyages across the Indian Ocean between 1405 and 1433?", answer: "Zheng He" },
            1: { question: "What event in 1453 ended the Byzantine Empire?", answer: "The Ottoman conquest of Constantinople" },
            2: { question: "What Portuguese-sponsored explorer reached the southern tip of Africa in 1488?", answer: "Bartolomeu Dias" },
            3: { question: "What Spanish-sponsored explorer reached the Caribbean in 1492, initiating sustained contact between the hemispheres?", answer: "Christopher Columbus" },
            4: { question: "What empire, founded by Sundiata, reached its height under Mansa Musa and controlled trans-Saharan trade routes?", answer: "The Mali Empire" },
            5: { question: "What Aztec capital city, built on a lake island, was one of the largest cities in the world by 1500?", answer: "Tenochtitlan" },
            6: { question: "What Ottoman sultan conquered Constantinople in 1453?", answer: "Mehmed II (Mehmed the Conqueror)" },
            7: { question: "What West African empire replaced Mali as the dominant Saharan trade power by the late 1400s?", answer: "The Songhai Empire" },
            8: { question: "What Mesoamerican empire demanded tribute and human sacrifice from subjugated peoples in the 1400s?", answer: "The Aztec (Mexica) Empire" },
            9: { question: "What South American empire stretched thousands of miles along the Andes and used a road system and quipu for administration?", answer: "The Inca Empire" },
            10: { question: "What Portuguese explorer sailed around the Cape of Good Hope and reached India in 1498?", answer: "Vasco da Gama" },
            11: { question: "What printing innovation, developed by Gutenberg around 1440, accelerated the spread of ideas across Europe?", answer: "The movable type printing press" },
            12: { question: "What political marriages unified the Spanish kingdoms of Castile and Aragon in 1469?", answer: "The marriage of Ferdinand and Isabella" },
            13: { question: "What 1494 treaty divided the non-European world between Spain and Portugal?", answer: "The Treaty of Tordesillas" },
            14: { question: "What Indian Ocean port city became the most important hub for spice trade by the early 1500s?", answer: "Malacca" },
            15: { question: "What artistic and intellectual movement, centered in Italian city-states, emphasized humanism and classical learning in the 1400s?", answer: "The Renaissance" },
            16: { question: "What nomadic Central Asian conqueror founded the Timurid Empire and briefly threatened the Ottomans in the early 1400s?", answer: "Timur (Tamerlane)" },
            17: { question: "What Ming Dynasty policy reversed Zheng He's voyages and restricted Chinese maritime trade?", answer: "The haijin (maritime prohibition) policy" },
            18: { question: "What disease environment made sub-Saharan Africa difficult for European colonizers to penetrate in the 1400s?", answer: "Malaria and other tropical diseases (the 'disease barrier')" },
            19: { question: "What system of trading posts (feitorias) did the Portuguese establish along African and Asian coasts?", answer: "A maritime commercial empire based on fortified trading posts controlling key sea lanes" }
        },

        3: { // 1500-1700
 0: { question: "What biological phenomenon caused the deaths of up to 90% of indigenous populations in the Americas after European contact?", answer: "The Columbian Exchange introduction of Old World diseases" },
            1: { question: "What system of forced indigenous labor did the Spanish use in the Americas to extract silver and resources?", answer: "The encomienda (and later mita) system" },
            2: { question: "What religious movement begun by Martin Luther in 1517 fractured the unity of the Catholic Church in Europe?", answer: "The Protestant Reformation" },
            3: { question: "What massive silver mining complex in Bolivia became the cornerstone of the Spanish colonial economy?", answer: "Potosí" },
            4: { question: "What Spanish conqueror defeated the Aztec Empire between 1519 and 1521?", answer: "Hernán Cortés" },
            5: { question: "What Spanish conqueror toppled the Inca Empire in the 1530s?", answer: "Francisco Pizarro" },
            6: { question: "What Catholic response to the Protestant Reformation sought to reform the Church from within and reassert its authority?", answer: "The Counter-Reformation (Catholic Reformation)" },
            7: { question: "What global trade network emerged as silver from the Americas flowed to China in exchange for Chinese goods?", answer: "The Manila Galleon trade / early globalized silver trade" },
            8: { question: "What Ottoman ruler brought the empire to its greatest territorial extent in the mid-1500s?", answer: "Suleiman the Magnificent" },
            9: { question: "What Mughal emperor oversaw a policy of religious tolerance and syncretic rule in India in the late 1500s?", answer: "Akbar the Great" },
            10: { question: "What term describes the forced migration of millions of Africans to the Americas as enslaved laborers?", answer: "The transatlantic slave trade (Middle Passage)" },
            11: { question: "What 1588 naval battle marked the decline of Spanish naval dominance and the rise of English sea power?", answer: "The defeat of the Spanish Armada" },
            12: { question: "What economic theory held that colonies existed to enrich the mother country through trade surpluses and resource extraction?", answer: "Mercantilism" },
            13: { question: "What mixed-race social hierarchy did the Spanish establish in their American colonies?", answer: "The casta system" },
            14: { question: "What Safavid dynasty made what religion the state religion of Persia, creating lasting Sunni-Shia tensions?", answer: "Twelver Shia Islam" },
            15: { question: "What Japanese ruler reunified Japan after a century of civil war and began restricting foreign influence in the early 1600s?", answer: "Tokugawa Ieyasu (establishing the Tokugawa Shogunate)" },
            16: { question: "What agricultural items transferred from the Americas to the Old World transformed population growth globally?", answer: "Potatoes, maize (corn), and other American crops" },
            17: { question: "What European joint-stock companies dominated Indian Ocean and Asian trade in the early 1600s?", answer: "The Dutch VOC and British East India Company" },
            18: { question: "What conflict (1618–1648) devastated Central Europe and was rooted in religious and political rivalries between Protestant and Catholic states?", answer: "The Thirty Years' War" },
            19: { question: "What Chinese dynasty replaced the Ming in 1644 and was founded by the Manchu people from the north?", answer: "The Qing Dynasty" }
        },

        4: { // 1700-1900
            0: { question: "What economic transformation, beginning in Britain, shifted production from hand labor to machine-based manufacturing?", answer: "The Industrial Revolution" },
            1: { question: "What ideology, rooted in Enlightenment ideals, drove independence movements in the Americas and national unification in Europe?", answer: "Nationalism / liberalism" },
            2: { question: "What late 19th-century phenomenon saw European powers partition and colonize nearly all of Africa?", answer: "The Scramble for Africa / New Imperialism" },
            3: { question: "What 1789 revolution overthrew the French monarchy and spread ideals of liberty, equality, and fraternity?", answer: "The French Revolution" },
            4: { question: "What Haitian leader led the only successful slave revolution in history, establishing Haiti's independence in 1804?", answer: "Toussaint Louverture (and Jean-Jacques Dessalines)" },
            5: { question: "What intellectual movement emphasized reason, individual rights, and the social contract, inspiring revolutions across the Atlantic world?", answer: "The Enlightenment" },
            6: { question: "What British policy forced China to allow opium imports, revealing Qing weakness in the mid-1800s?", answer: "The result of the Opium Wars (1839–1842, 1856–1860)" },
            7: { question: "What Japanese response to Western pressure rapidly modernized the country's military, economy, and government after 1868?", answer: "The Meiji Restoration" },
            8: { question: "What technological innovations of the Industrial Revolution most transformed global trade and communication?", answer: "The steam engine, railways, steamships, and telegraph" },
            9: { question: "What mid-19th century ideology argued that history was driven by class conflict between the bourgeoisie and proletariat?", answer: "Marxism / scientific socialism (Karl Marx)" },
            10: { question: "What 1857 uprising against British rule in India led Britain to dissolve the East India Company and rule India directly?", answer: "The Sepoy Mutiny (Indian Rebellion of 1857)" },
            11: { question: "What pseudo-scientific ideology was used to justify European colonialism and the enslavement and subjugation of non-European peoples?", answer: "Social Darwinism and scientific racism" },
            12: { question: "What 1884–1885 conference saw European powers divide Africa among themselves with little regard for existing African boundaries or peoples?", answer: "The Berlin Conference" },
            13: { question: "What Chinese reform movement (1850–1864) inspired by a Christian-influenced ideology killed tens of millions in civil war?", answer: "The Taiping Rebellion" },
            14: { question: "What cash crop system forced Indonesian farmers to grow export crops for the Dutch, exemplifying exploitative colonial economics?", answer: "The Dutch Cultivation System (cultuurstelsel)" },
            15: { question: "What Latin American independence movements of the early 1800s were predominantly led by which social class?", answer: "Creoles (American-born people of European descent)" },
            16: { question: "What new industrial working class emerged in Europe and faced dangerous conditions, long hours, and child labor in factories?", answer: "The proletariat / urban industrial working class" },
            17: { question: "What abolitionist movement successfully ended the British slave trade in 1807 and slavery in British colonies in 1833?", answer: "The abolitionist movement (led by figures like William Wilberforce)" },
            18: { question: "What new form of imperial control involved European settlers displacing indigenous populations in Africa, Australia, and the Americas?", answer: "Settler colonialism" },
            19: { question: "What Zulu king built a powerful military state in southern Africa that successfully resisted British expansion for decades?", answer: "Shaka Zulu" }
        },

        5: { // 1900-1945
        0: { question: "What interconnected factors caused the outbreak of World War I in 1914?", answer: "MAIN causes: Militarism, Alliances, Imperialism, Nationalism" },
            1: { question: "What 1917 revolution brought the Bolsheviks to power in Russia under Lenin?", answer: "The Russian Revolution" },
            2: { question: "What economic catastrophe beginning in 1929 destabilized global economies and contributed to the rise of fascism?", answer: "The Great Depression" },
            3: { question: "What authoritarian ideology, emphasizing ultranationalism, militarism, and state supremacy, rose in Italy and Germany in the 1920s–30s?", answer: "Fascism" },
            4: { question: "What German policy of systematic genocide killed six million Jews and millions of others during World War II?", answer: "The Holocaust" },
            5: { question: "What 1919 peace settlement humiliated Germany with war guilt, reparations, and territorial losses, sowing seeds for WWII?", answer: "The Treaty of Versailles" },
            6: { question: "What Chinese revolutionary founded the Republic of China and led the nationalist movement against imperial rule?", answer: "Sun Yat-sen" },
            7: { question: "What Indian independence leader pioneered nonviolent civil disobedience against British colonial rule?", answer: "Mohandas (Mahatma) Gandhi" },
            8: { question: "What Soviet leader forced rapid industrialization and collectivization through brutal five-year plans in the 1930s?", answer: "Joseph Stalin" },
            9: { question: "What new form of industrialized warfare, including trenches, poison gas, and machine guns, defined World War I?", answer: "Total war / trench warfare" },
            10: { question: "What 1917 declaration promised British support for a Jewish homeland in Palestine, creating lasting geopolitical tensions?", answer: "The Balfour Declaration" },
            11: { question: "What pan-African ideology advocated for the unity and liberation of African peoples from colonial rule?", answer: "Pan-Africanism" },
            12: { question: "What policy did Western democracies pursue toward Hitler in the late 1930s, hoping to avoid war by conceding territory?", answer: "Appeasement" },
            13: { question: "What Chinese communist leader rose to power during the Long March and eventually founded the People's Republic of China?", answer: "Mao Zedong" },
            14: { question: "What Japanese imperial expansion into Manchuria (1931) and China (1937) demonstrated the failure of the League of Nations?", answer: "Japanese aggression in Asia / the Manchurian Crisis" },
            15: { question: "What new economic theory, developed by John Maynard Keynes, advocated government spending to counter recessions?", answer: "Keynesian economics" },
            16: { question: "What 1918 global pandemic killed more people than World War I itself, disproportionately affecting the young and healthy?", answer: "The Spanish Flu (influenza pandemic)" },
            17: { question: "What nationalist movement in Turkey, led by Mustafa Kemal, dismantled the Ottoman Empire and built a secular republic?", answer: "The Turkish nationalist movement / Kemalism (Atatürk)" },
            18: { question: "What term describes the massive civilian and military mobilization of entire economies and societies for World War II?", answer: "Total war" },
            19: { question: "What US decision to drop atomic bombs on Hiroshima and Nagasaki in 1945 ended WWII and inaugurated the nuclear age?", answer: "The atomic bombings of Japan" }
        },

        6: { // 1945-2000
        0: { question: "What ideological rivalry between the United States and Soviet Union defined global politics from 1945 to 1991?", answer: "The Cold War" },
        1: { question: "What wave of political independence movements swept through Asia and Africa after World War II?", answer: "Decolonization" },
        2: { question: "What 1947 partition of British India created two independent states and triggered massive communal violence?", answer: "The partition of India and Pakistan" },
        3: { question: "What military alliance, formed in 1949, committed Western democracies to mutual defense against Soviet aggression?", answer: "NATO (North Atlantic Treaty Organization)" },
        4: { question: "What Korean War outcome established the ongoing division of the Korean peninsula along the 38th parallel?", answer: "The armistice of 1953 / division of North and South Korea" },
        5: { question: "What 1955 conference of newly independent Asian and African nations promoted non-alignment and solidarity against colonialism?", answer: "The Bandung Conference" },
        6: { question: "What Cuban Missile Crisis of 1962 brought the US and USSR closest to nuclear war during the Cold War?", answer: "The Cuban Missile Crisis" },
        7: { question: "What South African system of institutionalized racial segregation and oppression lasted from 1948 to 1994?", answer: "Apartheid" },
        8: { question: "What US foreign policy committed America to containing the spread of communism globally after 1947?", answer: "The Truman Doctrine / containment policy" },
        9: { question: "What 1991 event marked the formal dissolution of the Soviet Union into 15 independent republics?", answer: "The collapse of the Soviet Union" },
        10: { question: "What international economic institutions, created after WWII, governed global trade and finance?", answer: "The IMF, World Bank, and GATT (later WTO)" },
        11: { question: "What term describes the post-Cold War surge in regional and ethnic conflicts as superpower restraint collapsed?", answer: "Ethnic nationalism / 'new wars' of the 1990s (e.g., Yugoslavia, Rwanda)" },
        12: { question: "What economic and cultural process accelerated after the Cold War, connecting nations through trade, communication, and migration?", answer: "Globalization" },
        13: { question: "What digital revolution transformed communication, commerce, and society beginning in the 1990s?", answer: "The rise of the internet and information technology" },
        14: { question: "What economic rise of China transformed global manufacturing, trade, and geopolitical power after the 1990s?", answer: "China's economic liberalization and rise as a global power" },
        15: { question: "What 1994 genocide in Rwanda resulted in the deaths of approximately 800,000 people in just 100 days?", answer: "The Rwandan Genocide" }
        },

        7: { // 2000-2026
        0: { question: "What 2001 terrorist attacks on the United States triggered wars in Afghanistan and Iraq and reshaped global geopolitics?", answer: "The September 11 attacks (al-Qaeda)" },
        1: { question: "What environmental crisis, caused by fossil fuel emissions, has become the defining long-term threat of the 21st century?", answer: "Climate change / global warming" },
        2: { question: "What 2008 global financial crisis exposed the risks of deregulated financial markets and triggered worldwide recession?", answer: "The Great Recession / 2008 financial crisis" },
        3: { question: "What wave of pro-democracy uprisings swept across the Arab world beginning in 2010?", answer: "The Arab Spring" },
        4: { question: "What 2020 global pandemic caused by COVID-19 disrupted economies, exposed global inequalities, and accelerated deglobalization trends?", answer: "The COVID-19 pandemic" },
        5: { question: "What Russian invasion of Ukraine in 2022 triggered the largest European land war since WWII and reshaped NATO's strategic posture?", answer: "The 2022 Russian invasion of Ukraine" },
        6: { question: "What rapid advances in artificial intelligence, particularly large language models, transformed industries and labor markets in the 2020s?", answer: "The AI revolution / generative AI boom" },
        7: { question: "What social media platforms became dominant forces in global politics, elections, and information dissemination after 2010?", answer: "Platforms like Facebook, Twitter/X, and TikTok" },
        8: { question: "What 2023 conflict between Israel and Hamas reignited widespread Middle Eastern tensions and humanitarian crises?", answer: "The Israel-Hamas war (2023-present)" },
        9: { question: "What shift toward renewable energy sources accelerated in the 2020s as nations sought alternatives to fossil fuels?", answer: "The green energy transition (solar, wind, electric vehicles)" }
        },

        8: { // ∞
        0: { question: "What concept describes the theoretical endpoint where artificial intelligence surpasses human intelligence across all domains?", answer: "The technological singularity" },
        1: { question: "What paradox asks whether a simulated reality can be distinguished from base reality, and what are its implications for civilization?", answer: "The simulation hypothesis" },
        2: { question: "What interstellar propulsion concept, requiring breakthroughs in physics, could enable travel between stars?", answer: "Warp drive / antimatter propulsion / fusion rockets" },
        3: { question: "What Kardashev scale measures a civilization's advancement by its energy consumption?", answer: "The Kardashev scale (Type I, II, III)" },
        4: { question: "What existential risks threaten the long-term survival of human civilization?", answer: "Nuclear war, engineered pandemics, unaligned AI, climate collapse, asteroid impact" }
        }

    };

    constructor(initial?: Record<number, Record<number, LegacyQuestionEntry>>){
        if (initial) this.questions = initial;
        // Keep backward compatibility with legacy string-only question maps.
        this.normalizeQuestions();
    }

    private normalizeQuestions(): void {
        for (const [timePeriodStr, period] of Object.entries(this.questions)) {
            const timePeriod = Number(timePeriodStr);
            for (const [questionIdStr, questionOrEntry] of Object.entries(period)) {
                const questionId = Number(questionIdStr);
                if (typeof questionOrEntry === "string") {
                    // Promote legacy string entries into indexed records: 0=question, 1=answer.
                    period[questionId] = {
                        0: questionOrEntry,
                        1: this.buildDefaultAnswer(timePeriod, questionId, questionOrEntry)
                    };
                    continue;
                }

                if ("question" in questionOrEntry && "answer" in questionOrEntry) {
                    // Migrate object records into indexed records.
                    period[questionId] = {
                        0: questionOrEntry.question,
                        1: questionOrEntry.answer
                    };
                }
            }
        }
    }

    private buildDefaultAnswer(timePeriod: number, questionId: number, questionText: string): string {
        return `A historically grounded explanation for period ${timePeriod}, question ${questionId}: ${questionText}`;
    }

    private getQuestionEntry(timePeriod: number, questionId: number): QuestionEntry | null {
        const period = this.questions[timePeriod];
        if (!period) return null;

        const entry = period[questionId];
        if (!entry) return null;

        if (typeof entry === "string") {
            const normalizedEntry: IndexedQuestionEntry = {
                0: entry,
                1: this.buildDefaultAnswer(timePeriod, questionId, entry)
            };
            period[questionId] = normalizedEntry;
            return { question: normalizedEntry[0], answer: normalizedEntry[1] };
        }

        if ("question" in entry && "answer" in entry) {
            return { question: entry.question, answer: entry.answer };
        }

        return { question: entry[0], answer: entry[1] };
    }

    private shuffle<T>(items: T[]): T[] {
        const arr = [...items];
        // Fisher-Yates shuffle for unbiased randomized answer order.
        for (let i = arr.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [arr[i], arr[j]] = [arr[j], arr[i]];
        }
        return arr;
    }

    public getTimePeriods(): number[] {
        return Object.keys(this.questions).map(Number);
    }

    public getQuestion(timePeriod: number, questionId: number): string {
        const entry = this.getQuestionEntry(timePeriod, questionId);
        return entry?.question ?? "";
    }

    public getAnswer(timePeriod: number, questionId: number): string {
        const entry = this.getQuestionEntry(timePeriod, questionId);
        return entry?.answer ?? "";
    }

    public getQuestionIds(timePeriod: number): number[] {
        const period = this.questions[timePeriod];
        if (!period) return [];
        return Object.keys(period).map(Number);
    }

    public setQuestion(timePeriod: number, questionId: number, text: string): void {
        if (!this.questions[timePeriod]) this.questions[timePeriod] = {};
        this.questions[timePeriod][questionId] = {
            0: text,
            1: this.buildDefaultAnswer(timePeriod, questionId, text)
        };
    }

    public setQuestionWithAnswer(timePeriod: number, questionId: number, question: string, answer: string): void {
        if (!this.questions[timePeriod]) this.questions[timePeriod] = {};
        this.questions[timePeriod][questionId] = { 0: question, 1: answer };
    }

    public getQuestionWithChoices(timePeriod: number = -1): MultipleChoiceQuestion | null {
        const timePeriods = this.getTimePeriods();
        if (timePeriods.length === 0) return null;

        const chosenTimePeriod = timePeriod === -1
            ? timePeriods[Math.floor(Math.random() * timePeriods.length)]
            : timePeriod;

        const questionIds = this.getQuestionIds(chosenTimePeriod);
        if (questionIds.length === 0) return null;

        const questionId = questionIds[Math.floor(Math.random() * questionIds.length)];
        const entry = this.getQuestionEntry(chosenTimePeriod, questionId);
        if (!entry) return null;

        // Build distractors from the same time period as the selected question.
        const distractorPool: string[] = [];
        for (const candidateId of this.getQuestionIds(chosenTimePeriod)) {
            if (candidateId === questionId) continue;
            const candidateEntry = this.getQuestionEntry(chosenTimePeriod, candidateId);
            if (candidateEntry) {
                distractorPool.push(candidateEntry.answer);
            }
        }

        const distractors = this.shuffle(distractorPool).slice(0, 3);
        const choices = this.shuffle([entry.answer, ...distractors]);

        return {
            timePeriod: chosenTimePeriod,
            questionId,
            question: entry.question,
            correctAnswer: entry.answer,
            choices
        };
    }

    public deleteQuestion(timePeriod: number, questionId: number): boolean {
        const period = this.questions[timePeriod];
        if (!period || !(questionId in period)) return false;
        delete period[questionId];
        if (Object.keys(period).length === 0) delete this.questions[timePeriod];
        return true;
    }
}
