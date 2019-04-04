# BOM-node-server

<table>
<tbody>
<tr>
  <th>Dependancy</th>
  <th>Version</th>
  <th>Note</th>
</tr>
<tr>
  <td>Node</td>
  <td>8.x (LTS)</td>
  <td></td>
</tr>
<tr>
  <td>npm</td>
  <td>6.x</td>
  <td><a href="https://nodejs.org/en/download/releases/" target="_blank">Observe Node Releases</a></td>
</tr>
<tr>
  <td>MySQL</td>
  <td>5.7</td>
  <td>Primary DataStore</td>
</tr>
<tr>
  <td>Redis</td>
  <td>-</td>
  <td>Session Store (Coming Soon)</td>
</tr>
</tbody>
</table>


# Configuration & Setup

## Local (Dev) Install Steps

1. If you don't have mysql installed already be sure to follow the steps below [Localhost MYSQL](#Localhost-MYSQL)

2. Create an AWS-S3 bucket & IAM Role as [outlined below](#AWS-S3-Storage)

3. Setup dot env file: `cp .env.sample .env.local` and populate `.env.local` with your environment's configuration options.

4. Run `NODE_ENV=local npm install` to install all dependencies (optional & development)

## Environment Variables

* `NODE_ENV`: (required) Which node environment are you using (currently: `development`, `acceptance`, `production`, `test` or `local`).  Values `local` and `test` have the following special conditions:
  * `test` are for running [mocha] tests
  * `local` adds optional & dev dependancies through `postinstall.sh`.  Requires `.env.local` to be setup before install
* `PORT`: (optional): Which port the server should listen to. Defaults: `3000`
* `VCAP_SERVICES`: (required for production) Used for PCF deployment which should be an encoded JSON. Refer to their documentation/configuration
* `DB_*`: (required if `VCAP_SERVICES` is not set): MySQL Database settings
  * `DB_USER`: Username
  * `DB_PASS`: Password
  * `DB_HOST`: Host
  * `DB_NAME`: Database Name (steps below suggest `myAppDb`)
  * `DB_PORT`: Database Port `DB_PORT=3306` (defaults to `3306`)
* `AWS_S3_*` AWS S3 Configuration
  * `AWS_S3_BUCKET`: S3 Bucket Name
  * `AWS_S3_SDK_KEY`: Key of the API Key-Pair
  * `AWS_S3_SDK_SECRET`: Secret of the API Key-Pair
  * `AWS_S3_REGION`: AWS Region (defaults to `us-east-1`)
* `SESSION_SECRET`: Session Salt
* `REQUEST_LOGGING_*`: Logging details into the pino logger
  * `REQUEST_LOGGING`: Enables the HTTP Request logging.  This value aliases to a boolean <sup>env-1</sup>. Defaults to `false`
  * `REQUEST_LOGGING_SESSION`: Request logging will include Session Data.  This value aliases to a boolean <sup>env-1, env-2</sup> Defaults to `false`
  * `REQUEST_LOGGING_COOKIE`: Request logging will include Cookie strings.  This value aliases to a boolean <sup>env-1, env-2</sup> Defaults to `false`
  * `REQUEST_LOGGER_ASSETS`: Request logging will include static file asset Data.  This value aliases to a boolean <sup>env-1, env-2</sup> Defaults to `false`
  * `REQUEST_LOGGING_MASK`: Request logging will mask object content with descriptor strings.  This value aliases to a boolean <sup>env-1</sup>. Defaults to `true`
* `DEBUG_SQL`: Enables the Sequelize debugging of raw queries.  This value aliases to a boolean <sup>env-1</sup>. Defaults to `false`
* `VERBOSE`: Enables extra logging including.  This value aliases to a boolean <sup>env-1</sup> or string `all`. Defaults to `false`
* `FRONTEND_URL`: Configure for CORS Ajax requests; can be comma separated but ignores PORT from origin
* `SKIPPOSTINSTALL`: is exclusively used for `postinstall.sh` to avoid install recursion

## Localhost MYSQL

### Install

Install MYSQL via OSX Brew: `brew install mysql@5.7` or otherwise use your favourite binary or package installer.

### Default Database Configuration

For convenience its recommended you setup a username, password and database as follows.

1. Login into MYSQL shell using your root credentials `mysql -u root -p` and you will be prompted for your MYSQL root password.

2. Create the Database `CREATE DATABASE myAppDb;`

3. Specify the new user `CREATE USER 'myAppUser'@'localhost' IDENTIFIED BY 'somethingSecret555111222';`

4. Add permissions (*Choose One*):

 * to all databases `GRANT ALL PRIVILEGES ON * . * TO 'myAppUser'@'localhost';`

 * **OR**

 * to specific databases with our default name `GRANT ALL PRIVILEGES ON myAppDb . * TO 'myAppUser'@'localhost';`

5. Flush Permissions `FLUSH PRIVILEGES;`

6. Exit MYSQL Terminal `quit`

### Debugging Queries

In app setup we configure each connection to change a SQL Variable.  Use the following in you SQL manager's raw query terminal:

```
SET SESSION sql_mode=(SELECT REPLACE(@@sql_mode,'ONLY_FULL_GROUP_BY',''));

# YOUR DEBUG SQL GOES AFTER THIS LINE
```

## AWS S3 Storage

Create an IAM Role with the following settings

```
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Sid": "1",
            "Effect": "Allow",
            "Action": [
                "s3:CreateBucket",
                "s3:ListBucket",
                "s3:GetBucketLocation"
            ],
            "Resource": "arn:aws:s3:::*"
        },
        {
            "Sid": "2",
            "Effect": "Allow",
            "Action": [
                "s3:PutObject",
                "s3:GetObject",
                "s3:DeleteObject"
            ],
            "Resource": "arn:aws:s3:::*/*"
        }
    ]
}
```

You can test your [test IAM permissions](https://policysim.aws.amazon.com/home/index.jsp).  Additionally you can change the portion(s) `"Resource": "arn:aws:s3:::*"` can be `arn:aws:s3:::<BUCKETNAME>` if you don't want to give open access to your IAM role; however the given example is required to is `postinstall.js` to automatically create the bucket for you.

# Scripts

Use `npx <script>` or `npm run <script>` and replace '<script>' with any of the below

* `build` Trigger babel to compile code into `dist/` directory

* `start` Start the Application using the compiled babel code (set `NODE_ENV` environment variable); `npm run build` needs to be ran first

* `dev:*`

  * `dev` Start the application with `nodemon` with `NODE_ENV` set to 'local'

  * `dev:debug` Same as above with attached debugger

* `postinstall` Runs automatically after `npm install` but calls `postinstall.sh` which eventually calls `postinstall.js`<sup>db-1</sup>.

* `teardown` Executes `uninstall.sh` which removes node dependancies, caches, builds and data stores<sup>db-1</sup>.

* `docs` Generate documentation

* `lint:*`

  * `lint` Runs npm run lint

  * `lint:prod` Runs above but will error if any warnings are triggered

* `db:*`

  * `db:migrate` Run sequelize migrations

  * `db:setup:fixture` Run sequelize seed data sets for local development

  * `db:seed` Run sequelize Seeds but path to the seed needs to be passed `npm run db:seed -- --seed path/to/seed.js`

  * `db:drop` Run sequelize undo all; run all 'down' steps for migrations & seeds`

  * `db:sync` (Coming Soon) Sync files with Data-Stores/Caches

  * `db:sync:s3` (Coming Soon) Sync MySQL records with S3 Store

* `test:*`

  * `test` Run Mocha test with `NODE_ENV` set to 'test'

  * `test:debug` Same as base 'test' (above) with attached debugger

  * `test:watch` Same as base 'test' (above) with 'watch mode' to refresh after files change

  * `test:coverage` Same as base 'test' (above) with a coverage report

  * `test:integrations` Runt the test integration suite. `NODE_ENV` defaults to 'test'

* `coverage` Same as `npm run test:coverage` with coverage report opened in your default browser

# Project Structure

* `_cache/` For temporary files such as uploaded files and local store of served S3 files

* `dist/` build directory after compiling babel

* `dev/` SQL migrations, seeds and other assets such as place holder images

* `jsdocs/` JSDOCs documentation

* `src/` Application codebase

* `tests/` Mocha-Unit-Tests

* `coverage/` Istanbul coverage report files (html)


**Footnotes**

<sup>env-1</sup> This environment variable takes values as boolean.
* Boolean value of *true* aliases as `true`, `yes` or `1`.
* Boolean value of *false* aliases as `false`, `no` or `0`.

<sup>env-2</sup> Becomes equivalent to true when `VERBOSE` is set to `all`.

<sup>db-1</sup> Set `NODE_ENV` but will default to 'local' if not set
