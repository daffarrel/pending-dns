# Postal DNS

Lightweight API driven Authoritative DNS server. Extracted from [Project Pending](https://projectpending.com/).

## Features

-   All records can be edited over **REST API**
-   All **changes are effective immediatelly** (or as long as it takes Redis to distribute changes from master to replica instances)
-   All **basic record types** (A, AAAA, CNAME, TXT, MX, CAA)
-   **ANAME pseudo-record** for apex domains
-   **URL pseudo-record** for HTTP and HTTPS redirects. Valid HTTPS certificates are generated automatically, HTTPS host gets A+ rating from SSLabs.
-   **Lightweight**
-   Can be **geographically distributed**. All writes go to central Redis master, all reads are done from local Redis replica
-   Request **certificates over API**

**Limitations**

-   No support for zone files, all records must be managed over API
-   Only the most basic and common record types
-   No support for DNSSEC
-   Only plain old DNS over UDP and TCP, no DoH, no DoT

## Requirements

-   **Node.js**, preferrably v12+
-   **Redis**, any version should do as only basic commands are used

## Usage

```
$ npm install --production
$ npm start
```

### Run as SystemD service

If you want to run Postal DNS as a SystemD service, then there's an example [service file](systemd/postal-dns.service) with comments.

#### 1. Setup commands

As root run the following commands to set up PostalDNS:

```
$ cd /opt
$ git clone git://github.com/postalsys/postal-dns.git
$ cd postal-dns
$ npm install --production
$ cp systemd/postal-dns.service /etc/systemd/system
$ cp config/default.toml /etc/postal-dns.toml
```

#### 2. Configuration

Next edit the configuration file `/etc/postal-dns.toml` and make sure that you have correct configuration.

Also make sure that `/etc/systemd/system/postal-dns.service` looks correct.

#### 3. Start

Run the following commands as root

```
$ systemctl enable postal-dns
$ systemctl start postal-dns
```

## General Name Server setup

If you want to use Postal DNS as an authoritative DNS server for your domains then you need at least 2 instances of the server.

Additionally you need to set up both A and so-called GLUE records for the domain names of your name servers. Not all DNS providers allow to set GLUE records.

Here's an example how A records are set up for ns01.pendingdns.com and ns02.pendingdns.com (registrar and DNS provider for these domains is OVH):

![](https://cldup.com/BYsxTUZnzP.png)

And the corresponding GLUE records:

![](https://cldup.com/mBckKqqI6W.png)

Without proper setup domain registrars do not allow your name server domain names to be used.

![](https://cldup.com/l0U6jc5pfM.png)

## API

You can see the entire API docs from the swagger page at http://127.0.0.1:5080/docs

### List Zone entries

**GET /v1/zone/{zone}/records**

```
$ curl -X GET "http://127.0.0.1:5080/v1/zone/mailtanker.com/records"
```

```json
{
    "zone": "mailtanker.com",
    "records": [
        {
            "id": "Y29tLm1haWx0YW5rZXIBQQEzc3lKWkkzbGo",
            "type": "A",
            "address": "18.203.150.145"
        },
        {
            "id": "Y29tLm1haWx0YW5rZXIud3d3AUNOQU1FAXhhV1lnbnFaMA",
            "type": "CNAME",
            "subdomain": "www",
            "target": "mailtanker.com"
        }
    ]
}
```

**NB!** system records (NS, SOA) have id=null and these records can not be modified over API

### Create new Resource Record

**POST /v1/zone/{zone}/records**

```
$ curl -X POST "http://127.0.0.1:5080/v1/zone/mailtanker.com/records" -H "Content-Type: application/json" -d '{
    "subdomain": "www",
    "type": "CNAME",
    "target": "@"
}'
```

```json
{
    "zone": "mailtanker.com",
    "record": "Y29tLm1haWx0YW5rZXIud3d3AUNOQU1FAXhhV1lnbnFaMA"
}
```

All record types have the following properties

-   **subdomain** (optional) subdomain this record applies to. If blank, or "@" or missing then the record is created for zone domain.
-   **type** one of A, AAAA, CNAME, ANAME, URL, MX, TXT, CAA, NS

#### Type specific options

**A**

-   **address** is an IPv4 address

**AAAA**

-   **address** is an IPv6 address

**CNAME**

-   **target** is a domain name or "@" for zone domain

**ANAME**

-   **target** is a domain name

**TXT**

-   **data** is the data string without quotes. Provide the entire value, do not chop it into substrings

**MX**

-   **exchange** is the domain name of the MX server
-   **priority** is the priority number of the MX

**NS**

-   **ns** is the domain name of the NS server

**CAA**

-   **value** is the domain name of the provider, eg. `letsencrypt.org`
-   **tag** is the CAA tag, eg. `issue` or `issuewild`

### Modify existing Resource Record

**PUT /v1/zone/{zone}/records/{record}**

```
$ curl -X PUT "http://127.0.0.1:5080/v1/zone/mailtanker.com/records/Y29tLm1haWx0YW5rZXIud3d3AUNOQU1FAXhhV1lnbnFaMA" -H "Content-Type: application/json" -d '{
    "subdomain": "www",
    "type": "CNAME",
    "target": "example.com"
}'
```

```json
{
    "zone": "mailtanker.com",
    "record": "Y29tLm1haWx0YW5rZXIud3d3AUNOQU1FAXhhV1lnbnFaMA"
}
```

**NB!** resulting record ID might be different from the original ID

### Delete Resource Record

**DELETE /v1/zone/{zone}/records/{record}**

```
$ curl -X DELETE "http://127.0.0.1:5080/v1/zone/mailtanker.com/records/Y29tLm1haWx0YW5rZXIBQQFjT2NWd0d6bE4"
```

```json
{
    "zone": "mailtanker.com",
    "record": "Y29tLm1haWx0YW5rZXIBQQFjT2NWd0d6bE4",
    "deleted": true
}
```

### Generate Certificate

This API endpoint requests a new certificate from Let's Encrypt or returns a previously generated one.

Certificates can only be requested for domains that:

1. have at least one resource record set for their zone (not important which kind)
2. have correctly pointed NS records to your Postal DNS servers

```
$ curl -X POST "http://127.0.0.1:5080/v1/acme" -H "Content-Type: application/json" -d '{
    "domains": [
        "mailtanker.com",
        "*.mailtanker.com"
    ]
}'
```

```json
{
    "dnsNames": ["*.mailtanker.com", "mailtanker.com"],
    "key": "-----BEGIN RSA PRIVATE KEY-----\nMIIEpAIB...",
    "cert": "-----BEGIN CERTIFICATE-----\nMIIFaT...\n",
    "validFrom": "2020-06-03T18:50:52.000Z",
    "expires": "2020-09-01T18:50:52.000Z"
}
```

## License

**MIT**
