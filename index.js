// imports
const fs = require('fs');
const loadsh = require('lodash');
const csv = require("fast-csv");
const PNF = require('google-libphonenumber').PhoneNumberFormat;
const phoneUtil = require('google-libphonenumber').PhoneNumberUtil.getInstance();

// Arqs padrao
const leitura = './input.csv';
const gravacao = './output.json';
const leitura1 = './input1.csv';
const gravacao1 = './output1.json';

// Vars
var input = [];
var output = [];

DevChallenge(leitura, gravacao);
//DevChallenge(leitura1, gravacao1);

// Carregando arq.
function DevChallenge(reader, writer){    
    csv.fromPath(reader)
        .on("data", function (data) {input.push(data)})
        .on("end", function () {
            console.log('process finished');
            MainFunc(input);
            GeraArq(output, writer);});
        //.on("error", function (err) {console.log("***ERROR_DevChallenge***")});
}

// Trata telefone
function ExtractPhone(tel, pais){
    var ret = [];
    try{
        var number = phoneUtil.parse(tel, pais);
        if (phoneUtil.isValidNumberForRegion(number, pais)) {
            ret.push(phoneUtil.format(number, PNF.E164).replace('+', ''));
        }
        else{
            throw "***ERROR_ExtractPhone****";
        }
    } 
    catch (err) {
        ret.push('');
    }
    return ret;
}

// Trata email
function ExtractEmails(emails){
    var ret = emails.match(/([a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+)/g);
    return ret == null ? [] : ret;
}
    
// Trata Grupos 
function ExtractGroups(groups){
    let ret = groups.split(/[^\w ]/);
    return loadsh.map(ret, loadsh.trim);
}

// Salva DATA no arq
function GeraArq(data, writer) {
    fs.writeFile(writer, JSON.stringify(data), (err) => {if (err) throw err});
}

// Main function
function MainFunc(csv) {
    var header = csv[0];
    var rows = csv.slice(1);
    var groupId = [];
    var groupDet = [];    
    var addressId = [];
    var addressDet = [];

    // pegando colunas do header
    var count = 0;
    header.forEach(aux => {
        aux = aux.replace(', ', ',');
        let parts = aux.split(' ');

        // acertando os campos, para os conteudos
        if (parts.length > 1) {
            groupDet = [];

            groupDet.push(""+parts[1].split(',')+"");
            try { // temp_solution
                groupDet.push(""+parts[2].split(',')+"");
            } catch (error) {}
                        
            if (parts[0] === 'email') {
                addressDet.push({ "type": 'email', "tags": groupDet });                
            } else if (parts[0] === 'phone') {
                addressDet.push({ "type": 'phone', "tags": groupDet });
            }
            addressId.push(count);
        } else {
            addressDet.push(null);
            if (parts[0] === 'group') {
                groupId.push(count);
            }
        }
        count++;
    });

    rows.forEach(row => {    
        var regEID = false;

        var reg = loadsh.find(output, function (person) {
            return person.eid === row[1];
        });

        if (reg == undefined) {
            regEID = true;
            reg = {
                "fullname": row[0],
                "eid": row[1],
                "groups": [],
                "addresses": [],
                "invisible": false,
                "see_all": false
            };
        }

        // validando "see_all:"
        let seeall = row[row.length - 1];
        if ((seeall == '1') || (seeall.toUpperCase() == 'YES')) {
            reg.see_all = true;
        }
        else if ((seeall == '0') || (seeall.toUpperCase() == 'NO')) {
            reg.see_all = false;
        }
        else{ // não sei, provavel que o default seja falso.
            reg.see_all = false;
        }

        // validando "invisible:"
        let invisible = row[row.length - 2];
        if ((invisible == '1') || (invisible.toUpperCase() == 'YES')) {
            reg.invisible = true;
        }
        else if ((invisible == '0') || (invisible.toUpperCase() == 'NO')) {
            reg.invisible = false;
        }
        else{ // não sei, provavel que o default seja falso.
            reg.invisible = false;
        }

        // agrupando groups
        groupId.forEach(groupIndex => {
            let groups = ExtractGroups(row[groupIndex]);
            groups.forEach(aux => {
                if (loadsh.indexOf(reg.groups, aux) < 0 && aux !== '') {
                    reg.groups.push(aux);
                }
            });
        });

        // agrupando addresses
        addressId.forEach(auxId => {
            var addresses = [];
            var tipo = addressDet[auxId];

            if (tipo.type === "email") {
                addresses = ExtractEmails(row[auxId]);
            } else if (tipo.type === "phone") {
                addresses = ExtractPhone(row[auxId], 'BR');
            }

            // se tiver mais de um addresses
            addresses.forEach(aux => {
                let addressAux = JSON.parse(JSON.stringify(tipo));
                
                if (aux !== '') {
                    if (loadsh.isEqual(reg.addresses, [])) {
                        addressAux.address = aux;
                    } 
                    else {
                        reg.addresses.forEach(i => {
                            addressAux.address = aux;
                        });
                    }
                    reg.addresses.push(addressAux);
                }
            });
        });

        //Se tiver tratado os campos todos add
        if (regEID) {output.push(reg)};
    });
}
