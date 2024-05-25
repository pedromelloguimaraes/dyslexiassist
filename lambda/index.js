/* *
 * This sample demonstrates handling intents from an Alexa skill using the Alexa Skills Kit SDK (v2).
 * Please visit https://alexa.design/cookbook for additional examples on implementing slots, dialog management,
 * session persistence, api calls, and more.
 * */
const Alexa = require('ask-sdk-core');
const axios = require('axios');
const AWS = require('aws-sdk');
const ddbAdapter = require('ask-sdk-dynamodb-persistence-adapter');

function isAuthenticated(handlerInput){
    console.log('rodou')
    let dados = handlerInput.attributesManager.getSessionAttributes()
    if(dados.auth === true){
        console.log('ta autenticado')
        return true
    } else{
        console.log('nao ta autenticado')
        return false
    }
}

function setAuthSub(handlerInput){
    let dados = handlerInput.attributesManager.getSessionAttributes()
    dados.auth = true
    handlerInput.attributesManager.setSessionAttributes(dados)
}

function setAuth(handlerInput, escola){
    try{
        let dados = handlerInput.attributesManager.getSessionAttributes()
        setAuthSub(handlerInput)
        dados.escola = escola
        handlerInput.attributesManager.setSessionAttributes(dados)
    } catch(error){
      console.log(error)
      console.log('deu erro no setAuth')  
    }
}

const LaunchRequestHandler = {
    canHandle(handlerInput) {
        return Alexa.getRequestType(handlerInput.requestEnvelope) === 'LaunchRequest';
    },
    async handle(handlerInput) {
        let data = JSON.stringify({
            "collection": "Dispositivos",
            "database": "skillDislexia",
            "dataSource": "SkillDislexicos",
            "filter": {
                "id": handlerInput.requestEnvelope.context.System.device.deviceId
            }
        })
    
        let config = {
            method: 'post',
            url: 'https://sa-east-1.aws.data.mongodb-api.com/app/data-aeokt/endpoint/data/v1/action/findOne',
            timeout: 6500,
            headers: {
              'Content-Type': 'application/json',
              'Access-Control-Request-Headers': '*',
              'api-key': '610JXzbpIjJgn1DyN9HjPNVlMVrHNRUnN66fGIcc5IkOfCVLZYjHtT385XARwfkR'
            },
            data: data
        }
        
        await axios(config)
            .then(function (response){
                setAuth(handlerInput, response.data.document.escola)
            })
            .catch(function (error) {
                console.log(error);
            });
        let speakOutput = 'Bem vindo à leitura de provas. Diga ler prova para iniciar. Boa sorte!';
        if(!isAuthenticated(handlerInput)){
            speakOutput = 'Bem-vindo à skill de leitura de provas. Infelizmente, este dispositivo não está autenticado. Abra o painel da escola e obtenha o código para se autenticar. Após isso, diga "Alexa, inserir código" e siga os passos indicados.'
        }
        handlerInput.attributesManager.setPersistentAttributes([])
        await handlerInput.attributesManager.savePersistentAttributes()
        
        return handlerInput.responseBuilder
            .speak(speakOutput)
            .reprompt(speakOutput)
            .getResponse();
    }
};

const HelloWorldIntentHandler = {
    canHandle(handlerInput) {
        return Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest'
            && Alexa.getIntentName(handlerInput.requestEnvelope) === 'HelloWorldIntent';
    },
    handle(handlerInput) {
        const speakOutput = `${handlerInput.requestEnvelope.context.System.device.deviceId}`;

        return handlerInput.responseBuilder
            .speak(speakOutput)
            //.reprompt('add a reprompt if you want to keep the session open for the user to respond')
            .getResponse();
    }
};

const InserirCodigoIntentHandler = {
    canHandle(handlerInput) {
        return Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest'
            && Alexa.getIntentName(handlerInput.requestEnvelope) === 'InserirCodigoIntent';
    },
    async handle(handlerInput) {
        let speakOutput = ''
        //Checar se já está autenticado
        if(!isAuthenticated(handlerInput)){
            
            //Obter código falado
            let codigo = Alexa.getSlotValue(handlerInput.requestEnvelope, 'codigo')
            
            let data = JSON.stringify({
                "collection": "alexaCodes",
                "database": "skillDislexia",
                "dataSource": "SkillDislexicos",
                "filter": {
                    "code": `${codigo}`
                }
            })
        
            let config = {
                method: 'post',
                url: 'https://sa-east-1.aws.data.mongodb-api.com/app/data-aeokt/endpoint/data/v1/action/findOne',
                timeout: 6500,
                headers: {
                  'Content-Type': 'application/json',
                  'Access-Control-Request-Headers': '*',
                  'api-key': '610JXzbpIjJgn1DyN9HjPNVlMVrHNRUnN66fGIcc5IkOfCVLZYjHtT385XARwfkR'
                },
                data: data
            }
            
            //Buscar código na collection alexaCodes buscando ver se existe
            await axios(config)
                .then(async function (response) {
                    let data1 = JSON.stringify({
                        "collection": "Dispositivos",
                        "database": "skillDislexia",
                        "dataSource": "SkillDislexicos",
                        "document": {
                            "id": handlerInput.requestEnvelope.context.System.device.deviceId,
                            "escola": response.data.document.escola
                        }
                    })
                    
                    let config1 = {
                        method: 'post',
                        url: 'https://sa-east-1.aws.data.mongodb-api.com/app/data-aeokt/endpoint/data/v1/action/insertOne',
                        timeout: 6500,
                        headers: {
                          'Content-Type': 'application/json',
                          'Access-Control-Request-Headers': '*',
                          'api-key': '610JXzbpIjJgn1DyN9HjPNVlMVrHNRUnN66fGIcc5IkOfCVLZYjHtT385XARwfkR'
                        },
                        data: data1
                    };
                    
                    //Inserir código na collection Dispsitivos vinculado ao deviceId
                    await axios(config1)
                        .then(function (response1){
                            speakOutput = `O dispositivo foi autenticado com sucesso para uso na escola ${response.data.document.escola}`
                            setAuth(handlerInput, response.data.document.escola)
                        })
                        .catch(function (error){
                            console.log(error)
                            speakOutput = "Estou com problemas para acessar o sistema de login... Tente novamente mais tarde."
                        })
                
                })
                .catch(function (error) {
                    console.log(error);
                    speakOutput = "Estou com problemas para acessar o sistema de login... Tente novamente mais tarde."
                });
            
        } else{
            speakOutput = `Este dispositivo já está autenticado! Aproveite nosso serviço!`;
        }
        return handlerInput.responseBuilder
            .speak(speakOutput)
            //.reprompt('add a reprompt if you want to keep the session open for the user to respond')
            .getResponse();
    }
};

const LerProvaIntentHandler = {
    canHandle(handlerInput) {
        return Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest'
            && Alexa.getIntentName(handlerInput.requestEnvelope) === 'LerProvaIntent';
    },
    async handle(handlerInput) {
        let speakOutput = ''
        if(!isAuthenticated(handlerInput)){
            speakOutput = 'Infelizmente, este dispositivo não está autenticado. Abra o painel da escola e obtenha o código para se autenticar. Após isso, diga "Alexa, inserir código" e siga os passos indicados.'
        } else{
            
        function agora(){
            function convertTZ(date, tzString) {
                return new Date((typeof date === "string" ? new Date(date) : date).toLocaleString("en-US", {timeZone: tzString}));   
            }
            const now = new Date().toISOString() || "Deu errado"
            let nowtz = convertTZ(now, "America/Sao_Paulo")
            return nowtz
        }
        
        function falar(q, questao){
            
            let speak = ''
            let fala = []
            let letras = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j', 'k', 'l', 'm', 'n', 'o', 'p', 'q', 'r', 's', 't', 'u', 'v', 'w', 'x', 'y', 'z']
            
            //Verificar se há texto prévio
            if(q.textoPrevio[0] == true){
                for(let i = 1; i < q.textoPrevio.length; i++){
                    fala.push(q.textoPrevio[i])
                }
            }
            
            //Verificar se há comando inicial
            if(q.comando[0][0] == true){
                for(let i = 1; i < q.comando[0].length; i++){
                    fala.push(q.comando[0][i])
                }
            }
            
            fala.push(`Questão ${questao}.`)
            
            if(q.comando.length-1 > 1){
                for(let i = 1; i < q.comando.length; i++){
                    fala.push(`Letra ${letras[i]}.`)
                }
            } else{
                fala.push(q.comando[1])
            }
            
            for(let i = 0; i < fala.length; i++){
                if(i !== fala.length-1){
                    speak += `${fala[i]} <break strength="x-strong"/> `
                } else{
                    speak += fala[i]
                }
            }
            
            let speakOutput = `<prosody rate="slow"><lang xml:lang="pt-BR">${speak}</lang></prosody>`
            return speakOutput
        }
        
        function ordinalCardinal(t){
            let obj = {
                "1º": 1,
                "1ª": 1,
                "2º": 2,
                "2ª": 2,
                "3º": 3,
                "3ª": 3,
                "4º": 4,
                "4ª": 4,
                "5º": 5,
                "5ª": 5,
                "6º": 6,
                "6ª": 6,
                "7º": 7,
                "7ª": 7,
                "8º": 8,
                "8ª": 8,
                "9º": 9,
                "9ª": 9
            }
            
            let n = obj[t]
            console.log(`${n} - ${typeof(n)}`)
            return n
        }
        
        function segmentoSigla(s){
            let obj = {
                "fundamental um": "f1",
                "fundamental dois": "f2",
                "ensino médio": "em"
            }
            
            let sigla = obj[s]
            return sigla
        }
        
        //problema tá embaixo
        let escola = handlerInput.attributesManager.getSessionAttributes().escola
        
        let segmento = segmentoSigla(Alexa.getSlotValue(handlerInput.requestEnvelope, 'segmento'))
        
        let serie = ordinalCardinal(Alexa.getSlotValue(handlerInput.requestEnvelope, 'serie'))
        console.log(Alexa.getSlotValue(handlerInput.requestEnvelope, 'serie'))
        
        let materia = Alexa.getSlotValue(handlerInput.requestEnvelope, 'materia')

        let questao = parseInt(Alexa.getSlotValue(handlerInput.requestEnvelope, 'questao'))
        let q = {}
        let doc = {}
        let certoq = false
        
        let dados = handlerInput.attributesManager.getSessionAttributes();
        
        let speak = ''
        
        let data = JSON.stringify({
            "collection": "Provas",
            "database": "skillDislexia",
            "dataSource": "SkillDislexicos",
            "filter": {
                "escola": escola,
                "materia": materia,
                "serie": [ segmento, serie ]
            }
        });
        
        let config = {
            method: 'post',
            url: 'https://sa-east-1.aws.data.mongodb-api.com/app/data-aeokt/endpoint/data/v1/action/findOne',
            timeout: 6500,
            headers: {
              'Content-Type': 'application/json',
              'Access-Control-Request-Headers': '*',
              'api-key': '610JXzbpIjJgn1DyN9HjPNVlMVrHNRUnN66fGIcc5IkOfCVLZYjHtT385XARwfkR'
            },
            data: data
        };
        
        await axios(config)
            .then(function (response) {
                console.log(JSON.stringify(response.data));
                if(response.data && response.data.document){
                    doc = response.data.document
                    let now = Date.parse(agora())
                    let datainicio = Date.parse(doc.inicio)
                    let datafim = Date.parse(doc.fim)
                    console.log(`${doc}`)
                    console.log(`ISO inicio: ${doc.inicio}; ISO fim: ${doc.fim}`)
                    console.log(`Agora : "${now}"
                                 Início: "${datainicio}"
                                 Fim: "${datafim}"`)
                    dados.prova = doc
                    dados.questao = questao
                    if(datainicio && datafim && now >= datainicio && now <= datafim){
                        if(response.data.document.questoes){
                            let nquestoes = response.data.document.questoes.length
                            if(nquestoes >= questao){
                                q = response.data.document.questoes[questao-1]
                                speakOutput = falar(q, questao)
                
                                dados.repeticao = speakOutput
                            } else{
                                
                                if(nquestoes == 1){
                                    nquestoes = 'uma'
                                } else if(nquestoes == 2){
                                    nquestoes = 'duas'
                                }
                                speakOutput = `Essa prova só tem ${nquestoes} questões. A questão ${questao} não existe...`
                            }
                        } else{
                            speakOutput = "Poxa... Parece que essa prova não tem nenhuma questão!"
                        }
                    } else if(datainicio && datafim && now < datainicio){
                        speakOutput = "Essa prova ainda não pode ser acessada. Sinto muito..."
                    } else if(datainicio && datafim && now > datafim){
                        speakOutput = "Essa prova não pode mais ser acessada. Sinto muito..."
                    } else{
                        speakOutput = "O professor não definiu o horário de aplicação desta prova. Contacte-o se tiver alguma dúvida."
                    }
                } else{
                    speakOutput = "Estou com problemas para acessar a base de provas... Tente novamente mais tarde."
                }
                handlerInput.attributesManager.setSessionAttributes(dados);
                
            })
            .catch(function (error) {
                console.log(error);
                speakOutput = "Estou com problemas para acessar a base de provas... Tente novamente mais tarde."
            });
        }
        
        return handlerInput.responseBuilder
            .speak(speakOutput)
            .reprompt(speakOutput)
            .getResponse();
    }
};

const RepetirIntentHandler = {
    canHandle(handlerInput) {
        return Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest'
            && Alexa.getIntentName(handlerInput.requestEnvelope) === 'RepetirIntent';
    },
    handle(handlerInput) {
        
        console.log('ponto1')
        let speakOutput = ''
        if(!isAuthenticated(handlerInput)){
            speakOutput = 'Infelizmente, este dispositivo não está autenticado. Abra o painel da escola e obtenha o código para se autenticar. Após isso, diga "Alexa, inserir código" e siga os passos indicados.'
        } else{
        
        console.log('ponto2')
        let dados = handlerInput.attributesManager.getSessionAttributes();
        console.log(dados)
        function agora(){
            function convertTZ(date, tzString) {
                return new Date((typeof date === "string" ? new Date(date) : date).toLocaleString("en-US", {timeZone: tzString}));   
            }
            const now = new Date().toISOString() || "Deu errado"
            let nowtz = convertTZ(now, "America/Sao_Paulo")
            return nowtz
        }
        
        console.log('ponto3')
        let now = Date.parse(agora())
        let datainicio = Date.parse(dados.prova.inicio)
        let datafim = Date.parse(dados.prova.fim)
        
        console.log('ponto4')
        if(datainicio && datafim && now >= datainicio && now <= datafim){
            speakOutput = dados.repeticao || "Não há o que repetir."
        } else{
            speakOutput = `O tempo de aplicação dessa prova já se esgotou. Sinto muito...`
        }
        
        console.log('ponto5')
        }

        return handlerInput.responseBuilder
            .speak(speakOutput)
            .reprompt(speakOutput)
            .getResponse();
    }
};

const ProxQuestaoIntentHandler = {
    canHandle(handlerInput) {
        return Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest'
            && Alexa.getIntentName(handlerInput.requestEnvelope) === 'ProxQuestaoIntent';
    },
    async handle(handlerInput) {
        
        let speakOutput = ''
        if(!isAuthenticated(handlerInput)){
            speakOutput = 'Infelizmente, este dispositivo não está autenticado. Abra o painel da escola e obtenha o código para se autenticar. Após isso, diga "Alexa, inserir código" e siga os passos indicados.'
        } else{
        
        function falar(q, questao){
            
            let speak = ''
            let fala = []
            let letras = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j', 'k', 'l', 'm', 'n', 'o', 'p', 'q', 'r', 's', 't', 'u', 'v', 'w', 'x', 'y', 'z']
            
            //Verificar se há texto prévio
            if(q.textoPrevio[0] == true){
                for(let i = 1; i < q.textoPrevio.length; i++){
                    fala.push(q.textoPrevio[i])
                }
            }
            
            //Verificar se há comando inicial
            if(q.comando[0][0] == true){
                for(let i = 1; i < q.comando[0].length; i++){
                    fala.push(q.comando[0][i])
                }
            }
            
            fala.push(`Questão ${questao}.`)
            
            if(q.comando.length-1 > 1){
                for(let i = 1; i < q.comando.length; i++){
                    fala.push(`Letra ${letras[i]}.`)
                }
            } else{
                fala.push(q.comando[1])
            }
           9 
            for(let i = 0; i < fala.length; i++){
                if(i !== fala.length-1){
                    speak += `${fala[i]} <break strength="x-strong"/> `
                } else{
                    speak += fala[i]
                }
            }
            
            let speakOutput = `<prosody rate="slow"><lang xml:lang="pt-BR">${speak}</lang></prosody>`
            return speakOutput
        }
        
        function agora(){
            function convertTZ(date, tzString) {
                return new Date((typeof date === "string" ? new Date(date) : date).toLocaleString("en-US", {timeZone: tzString}));   
            }
            const now = new Date().toISOString() || "Deu errado"
            let nowtz = convertTZ(now, "America/Sao_Paulo")
            return nowtz
        }
        
        let dados = handlerInput.attributesManager.getSessionAttributes()
        
        let now = Date.parse(agora())
        let datainicio = Date.parse(dados.prova.inicio)
        let datafim = Date.parse(dados.prova.fim)
        if(datainicio && datafim && now >= datainicio && now <= datafim){
            if(dados && dados.prova && dados.questao && dados.prova.questoes){
                let doc = dados.prova
                
                if(doc.questoes.length > dados.questao){
                    let questao = doc.questoes[dados.questao]
                    speakOutput = falar(questao, dados.questao+1)
                    dados.repeticao = speakOutput
                    dados.questao++
                    handlerInput.attributesManager.setSessionAttributes(dados);
                } else {
                    speakOutput = 'Você já leu a última questão desta prova!';
                }
            } else {
                speakOutput = 'Peça antes para ler prova!';
            }
        } else{
            speakOutput = `O tempo de aplicação desta prova já se esgotou. Sinto muito...`
        }
        
        }

        return handlerInput.responseBuilder
            .speak(speakOutput)
            .reprompt(speakOutput)
            .getResponse();
    }
};

const QuestaoAnteriorIntentHandler = {
    canHandle(handlerInput) {
        return Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest'
            && Alexa.getIntentName(handlerInput.requestEnvelope) === 'QuestaoAnteriorIntent';
    },
    async handle(handlerInput) {
        
        let speakOutput = ''
        if(!isAuthenticated(handlerInput)){
            speakOutput = 'Infelizmente, este dispositivo não está autenticado. Abra o painel da escola e obtenha o código para se autenticar. Após isso, diga "Alexa, inserir código" e siga os passos indicados.'
        } else{
        
        function falar(q, questao){
            
            let speak = ''
            let fala = []
            let letras = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j', 'k', 'l', 'm', 'n', 'o', 'p', 'q', 'r', 's', 't', 'u', 'v', 'w', 'x', 'y', 'z']
            
            //Verificar se há texto prévio
            if(q.textoPrevio[0] == true){
                for(let i = 1; i < q.textoPrevio.length; i++){
                    fala.push(q.textoPrevio[i])
                }
            }
            
            //Verificar se há comando inicial
            if(q.comando[0][0] == true){
                for(let i = 1; i < q.comando[0].length; i++){
                    fala.push(q.comando[0][i])
                }
            }
            
            fala.push(`Questão ${questao}.`)
            
            if(q.comando.length-1 > 1){
                for(let i = 1; i < q.comando.length; i++){
                    fala.push(`Letra ${letras[i]}.`)
                }
            } else{
                fala.push(q.comando[1])
            }
           9 
            for(let i = 0; i < fala.length; i++){
                if(i !== fala.length-1){
                    speak += `${fala[i]} <break strength="x-strong"/> `
                } else{
                    speak += fala[i]
                }
            }
            
            let speakOutput = `<prosody rate="slow"><lang xml:lang="pt-BR">${speak}</lang></prosody>`
            return speakOutput
        }
        
        function agora(){
            function convertTZ(date, tzString) {
                return new Date((typeof date === "string" ? new Date(date) : date).toLocaleString("en-US", {timeZone: tzString}));   
            }
            const now = new Date().toISOString() || "Deu errado"
            let nowtz = convertTZ(now, "America/Sao_Paulo")
            return nowtz
        }
        
        let dados = handlerInput.attributesManager.getSessionAttributes()
        
        let now = Date.parse(agora())
        let datainicio = Date.parse(dados.prova.inicio)
        let datafim = Date.parse(dados.prova.fim)
        if(datainicio && datafim && now >= datainicio && now <= datafim){
            if(dados && dados.prova && dados.questao && dados.prova.questoes){
                let doc = dados.prova
                if(dados.questao-1 >= 1){
                    let questao = doc.questoes[dados.questao-2]
                    speakOutput = falar(questao, dados.questao-1)
                    dados.repeticao = speakOutput
                    dados.questao--
                    handlerInput.attributesManager.setSessionAttributes(dados);
                } else {
                    speakOutput = 'Você já leu a primeira questão desta prova!';
                }
            } else {
                speakOutput = 'Peça antes para ler prova!';
            }
        } else{
            speakOutput = `O tempo de aplicação desta prova já se esgotou. Sinto muito...`
        }
        
        }
        return handlerInput.responseBuilder
            .speak(speakOutput)
            .reprompt(speakOutput)
            .getResponse();
    }
};

const QuestaoEspecificaIntentHandler = {
    canHandle(handlerInput) {
        return Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest'
            && Alexa.getIntentName(handlerInput.requestEnvelope) === 'QuestaoEspecificaIntent';
    },
    async handle(handlerInput) {
        let speakOutput = ''
        if(!isAuthenticated(handlerInput)){
            speakOutput = 'Infelizmente, este dispositivo não está autenticado. Abra o painel da escola e obtenha o código para se autenticar. Após isso, diga "Alexa, inserir código" e siga os passos indicados.'
        } else{
        
        function falar(q, questao){
            
            let speak = ''
            let fala = []
            let letras = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j', 'k', 'l', 'm', 'n', 'o', 'p', 'q', 'r', 's', 't', 'u', 'v', 'w', 'x', 'y', 'z']
            
            //Verificar se há texto prévio
            if(q.textoPrevio[0] == true){
                for(let i = 1; i < q.textoPrevio.length; i++){
                    fala.push(q.textoPrevio[i])
                }
            }
            
            //Verificar se há comando inicial
            if(q.comando[0][0] == true){
                for(let i = 1; i < q.comando[0].length; i++){
                    fala.push(q.comando[0][i])
                }
            }
            
            fala.push(`Questão ${questao}.`)
            
            if(q.comando.length-1 > 1){
                for(let i = 1; i < q.comando.length; i++){
                    fala.push(`Letra ${letras[i]}.`)
                }
            } else{
                fala.push(q.comando[1])
            }
           9 
            for(let i = 0; i < fala.length; i++){
                if(i !== fala.length-1){
                    speak += `${fala[i]} <break strength="x-strong"/> `
                } else{
                    speak += fala[i]
                }
            }
            
            let speakOutput = `<prosody rate="slow"><lang xml:lang="pt-BR">${speak}</lang></prosody>`
            return speakOutput
        }
        
        function agora(){
            function convertTZ(date, tzString) {
                return new Date((typeof date === "string" ? new Date(date) : date).toLocaleString("en-US", {timeZone: tzString}));   
            }
            const now = new Date().toISOString() || "Deu errado"
            let nowtz = convertTZ(now, "America/Sao_Paulo")
            return nowtz
        }
        
        let dados = handlerInput.attributesManager.getSessionAttributes()
        
        let now = Date.parse(agora())
        let datainicio = Date.parse(dados.prova.inicio)
        let datafim = Date.parse(dados.prova.fim)
        let q = parseInt(Alexa.getSlotValue(handlerInput.requestEnvelope, 'questao'))
        console.log(q)
        if(datainicio && datafim && now >= datainicio && now <= datafim){
            if(dados && dados.prova && dados.questao && dados.prova.questoes){
                let doc = dados.prova
                console.log(doc.questoes)
                console.log(doc.questoes.length + " - " + q)
                if(q <= doc.questoes.length && q > 0){
                    let questao = doc.questoes[q-1]
                    console.log(questao)
                    speakOutput = falar(questao, q)
                    dados.repeticao = speakOutput
                    dados.questao = q
                    handlerInput.attributesManager.setSessionAttributes(dados);
                } else {
                    speakOutput = 'Essa questão não existe.';
                }
            } else {
                speakOutput = 'Peça antes para ler prova!';
            }
        } else{
            speakOutput = `O tempo de aplicação desta prova já se esgotou. Sinto muito...`
        }
        
        }
        return handlerInput.responseBuilder
            .speak(speakOutput)
            .reprompt(speakOutput)
            .getResponse();
    }
};
const HoraIntentHandler = {
    canHandle(handlerInput) {
        return Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest'
            && Alexa.getIntentName(handlerInput.requestEnvelope) === 'HoraIntent';
    },
    handle(handlerInput) {
        
        let speakOutput = 'oi'
        if(!isAuthenticated(handlerInput)){
            speakOutput = 'Infelizmente, este dispositivo não está autenticado. Abra o painel da escola e obtenha o código para se autenticar. Após isso, diga "Alexa, inserir código" e siga os passos indicados.'
        } else{
        function agora(){
            function convertTZ(date, tzString) {
                return new Date((typeof date === "string" ? new Date(date) : date).toLocaleString("en-US", {timeZone: tzString}));   
            }
            const now = new Date().toISOString() || "Deu errado"
            let nowtz = convertTZ(now, "America/Sao_Paulo")
            return nowtz
        }
        
        }

        return handlerInput.responseBuilder
            .speak(speakOutput)
            .reprompt(speakOutput)
            .getResponse();
    }
};

const HelpIntentHandler = {
    canHandle(handlerInput) {
        return Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest'
            && Alexa.getIntentName(handlerInput.requestEnvelope) === 'AMAZON.HelpIntent';
    },
    handle(handlerInput) {
        const speakOutput = 'You can say hello to me! How can I help?';

        return handlerInput.responseBuilder
            .speak(speakOutput)
            .reprompt(speakOutput)
            .getResponse();
    }
};

const CancelAndStopIntentHandler = {
    canHandle(handlerInput) {
        return Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest'
            && (Alexa.getIntentName(handlerInput.requestEnvelope) === 'AMAZON.CancelIntent'
                || Alexa.getIntentName(handlerInput.requestEnvelope) === 'AMAZON.StopIntent');
    },
    handle(handlerInput) {
        const speakOutput = 'Goodbye!';

        return handlerInput.responseBuilder
            .speak(speakOutput)
            .getResponse();
    }
};
/* *
 * FallbackIntent triggers when a customer says something that doesn’t map to any intents in your skill
 * It must also be defined in the language model (if the locale supports it)
 * This handler can be safely added but will be ingnored in locales that do not support it yet 
 * */
const FallbackIntentHandler = {
    canHandle(handlerInput) {
        return Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest'
            && Alexa.getIntentName(handlerInput.requestEnvelope) === 'AMAZON.FallbackIntent';
    },
    handle(handlerInput) {
        const speakOutput = 'Sorry, I don\'t know about that. Please try again.';

        return handlerInput.responseBuilder
            .speak(speakOutput)
            .reprompt(speakOutput)
            .getResponse();
    }
};
/* *
 * SessionEndedRequest notifies that a session was ended. This handler will be triggered when a currently open 
 * session is closed for one of the following reasons: 1) The user says "exit" or "quit". 2) The user does not 
 * respond or says something that does not match an intent defined in your voice model. 3) An error occurs 
 * */
const SessionEndedRequestHandler = {
    canHandle(handlerInput) {
        return Alexa.getRequestType(handlerInput.requestEnvelope) === 'SessionEndedRequest';
    },
    handle(handlerInput) {
        console.log(`~~~~ Session ended: ${JSON.stringify(handlerInput.requestEnvelope)}`);
        // Any cleanup logic goes here.
        
        //return handlerInput.responseBuilder.getResponse(); // notice we send an empty response
        
        return handlerInput.responseBuilder
            .speak('Tchauzinho, meu amigucho')
            .getResponse()
    }
};
/* *
 * The intent reflector is used for interaction model testing and debugging.
 * It will simply repeat the intent the user said. You can create custom handlers for your intents 
 * by defining them above, then also adding them to the request handler chain below 
 * */
const IntentReflectorHandler = {
    canHandle(handlerInput) {
        return Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest';
    },
    handle(handlerInput) {
        const intentName = Alexa.getIntentName(handlerInput.requestEnvelope);
        const speakOutput = `You just triggered ${intentName}`;

        return handlerInput.responseBuilder
            .speak(speakOutput)
            //.reprompt('add a reprompt if you want to keep the session open for the user to respond')
            .getResponse();
    }
};
/**
 * Generic error handling to capture any syntax or routing errors. If you receive an error
 * stating the request handler chain is not found, you have not implemented a handler for
 * the intent being invoked or included it in the skill builder below 
 * */
const ErrorHandler = {
    canHandle() {
        return true;
    },
    handle(handlerInput, error) {
        const speakOutput = 'Sorry, I had trouble doing what you asked. Please try again.';
        console.log(`~~~~ Error handled: ${JSON.stringify(error)}`);

        return handlerInput.responseBuilder
            .speak(speakOutput)
            .reprompt(speakOutput)
            .withShouldEndSession(false)
            .getResponse();
    }
};

/**
 * This handler acts as the entry point for your skill, routing all request and response
 * payloads to the handlers above. Make sure any new handlers or interceptors you've
 * defined are included below. The order matters - they're processed top to bottom 
 * */
exports.handler = Alexa.SkillBuilders.custom()
    .addRequestHandlers(
        LaunchRequestHandler,
        HelloWorldIntentHandler,
        LerProvaIntentHandler,
        RepetirIntentHandler,
        ProxQuestaoIntentHandler,
        QuestaoAnteriorIntentHandler,
        QuestaoEspecificaIntentHandler,
        HoraIntentHandler,
        InserirCodigoIntentHandler,
        HelpIntentHandler,
        CancelAndStopIntentHandler,
        FallbackIntentHandler,
        SessionEndedRequestHandler,
        IntentReflectorHandler)
    .addErrorHandlers(
        ErrorHandler)
    .withCustomUserAgent('sample/hello-world/v1.2')
    .withPersistenceAdapter(
        new ddbAdapter.DynamoDbPersistenceAdapter({
            tableName: process.env.DYNAMODB_PERSISTENCE_TABLE_NAME,
            createTable: false,
            dynamoDBClient: new AWS.DynamoDB({apiVersion: 'latest', region: process.env.DYNAMODB_PERSISTENCE_REGION})
        })
    )
    .lambda();
