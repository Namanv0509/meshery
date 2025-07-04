---
layout: page
title: Meshery Documentation
permalink: /
display-title: "false"
display-toc: "false"
language: en
list: exclude
---

{% assign sorted_pages = site.pages | sort: "name" | alphabetical %}

<div style="display:grid; justify-items:center">
  <div style="align-self:center; margin-bottom:0px; margin-top:0px;padding-top:0px; padding-bottom:0px;width:clamp(170px, 50%, 800px);">
    {% include svg/meshery-logo.html %}
  </div>
  <h3 style="font-size:1.6rem">As a self-service engineering platform, Meshery enables collaborative design and operation of cloud and cloud native infrastructure.</h3>
</div>
<div class="flex flex-col--2 container">
  <!-- OVERVIEW -->
  <div class="section">
    <a href="{{ site.baseurl }}/installation">
        <div class="btn-primary">Overview & Installation</div>
    </a>
    <ul>
        <li>🚀 <a href="{{ site.baseurl }}/installation/quick-start">Quick Start</a> and <a href="{{ site.baseurl }}/project/faq">FAQs</a></li>
    </ul>
    <details>
      <summary>
        <p style="display:inline">
          <a href="{{ site.baseurl }}/installation/" class="text-black">Installation</a>
        </p>
      </summary>
      <ul class="section-title">
      {% assign sorted_installation = site.pages | where: "type","installation" %}
      {% for item in sorted_installation  %}
      {% if item.type=="installation" and item.list=="include" and item.language == "en" -%}
        <li><a href="{{ site.baseurl }}{{ item.url }}">{{ item.title }}</a>
        {% if item.abstract %}
          - {{ item.abstract }}
        {% endif %}
        </li>
        {% endif %}
      {% endfor %}
    </ul>
    </details>
  </div>

    <!-- CONCEPTS -->

  <div class="section">
    <a href="{{ site.baseurl }}/concepts">
        <div class="btn-primary">Concepts</div>
    </a>
    <details>
      <summary>
        <p style="display:inline">
          <a href="{{ site.baseurl }}/concepts/logical" class="text-black">Logical</a>
        </p>
      </summary>
      <ul class="section-title">
        {% assign sorted_concepts = site.pages | where: "type","concepts" %}
        {% for item in sorted_concepts %}
        {% if item.type=="concepts" and item.language=="en" -%}
          <li><a href="{{ site.baseurl }}{{ item.url }}">{{ item.title }}</a>
          {% if item.abstract != " " %}
         -  {{ item.abstract }}
          {% endif %}
          </li>
          {% endif %}
        {% endfor %}
      </ul>
    </details>
    <details>
      <summary>
        <p style="display:inline">
          <a href="{{ site.baseurl }}/concepts/architecture" class="text-black section-title">Architectural</a>
        </p>
      </summary>
      <ul>
        {% assign sorted_components = site.pages | where: "type","components" %}
        {% for item in sorted_components %}
        {% if item.type=="components" and item.language=="en" -%}
          <li><a href="{{ site.baseurl }}{{ item.url }}">{{ item.title }}</a>
            {% if item.abstract != " " %}
            - {{ item.abstract }}
            {% endif %}
          </li>
        {% endif %}
        {% endfor %}
      </ul>
    </details>
  </div>
</div>

<div class="flex flex-col--2 container">

<!-- GUIDES -->
  <div class="section">
    <a href="{{ site.baseurl }}/guides">
        <div class="btn-primary">Guides & Tutorials</div>
    </a>
    <details>
      <summary>
        <p style="display:inline">
          <a href="{{ site.baseurl }}/guides/mesheryctl/" class="text-black">Using Meshery CLI Guides</a>
        </p>
      </summary>
      <ul class="section-title">
        {% assign sorted_mesheryctl = site.pages | where: "type","guides" %}
        {% for item in sorted_mesheryctl %}
        {% if item.type=="guides" and item.category=="mesheryctl" and item.language=="en" -%}
          <li><a href="{{ site.baseurl }}{{ item.url }}">{{ item.title }}</a>
          {% if item.abstract != " " %}
            - {{ item.abstract }}
          {% endif %}
          </li>
          {% endif %}
        {% endfor %}
      </ul>
    </details>
    <details>
      <summary>
        <p style="display:inline">
          <a href="{{ site.baseurl }}/guides/tutorials/" class="text-black">🧑‍🔬 Tutorials</a>
        </p>
      </summary>
      <ul class="section-title">
        {% assign sorted_tutorials = site.pages | where: "type","guides" %}
        {% for item in sorted_tutorials %}
        {% if item.type=="guides" and item.category=="tutorials" and item.list=="include" and item.language=="en" -%}
          <li><a href="{{ site.baseurl }}{{ item.url }}">{{ item.title }}</a>
          {% if item.abstract != " " %}
            - {{ item.abstract }}
          {% endif %}
          </li>
          {% endif %}
        {% endfor %}
      </ul>
    </details>
    <details>
      <summary>
        <p style="display:inline">
          <a href="{{ site.baseurl }}/guides/infrastructure-management" class="text-black">Infrastructure Management</a>
        </p>
      </summary>
      <ul class="section-title">
       {% assign sorted_infrastructure = site.pages | where: "type","guides" %}
          {% for item in sorted_infrastructure %}
          {% if item.type=="guides" and item.category=="infrastructure" and item.language=="en" -%}
            <li><a href="{{ site.baseurl }}{{ item.url }}">{{ item.title }}</a>
            {% if item.abstract != " " %}
              -  {{ item.abstract }}
            {% endif %}
            </li>
            {% endif %}
          {% endfor %}
      </ul>
    </details>
        <details>
      <summary>
        <p style="display:inline">
          <a href="{{ site.baseurl }}/guides/performance-management" class="text-black">Performance Management</a>
        </p>
      </summary>
      <ul class="section-title">
        {% assign performance = site.pages | where: "type","guides" %}
          {% for item in performance %}
          {% if item.type=="guides" and item.category=="performance" and item.language=="en" -%}
            <li><a href="{{ site.baseurl }}{{ item.url }}">{{ item.title }}</a>
            {% if item.abstract != " " %}
              - {{ item.abstract }}
            {% endif %}
            </li>
            {% endif %}
          {% endfor %}
      </ul>
    </details>
      <details>
      <summary>
        <p style="display:inline">
          <a href="{{ site.baseurl }}/guides/infrastructure-management" class="text-black">Configuration Management</a>
        </p>
      </summary>
      <ul class="section-title">
        {% assign configuration = site.pages | where: "type","guides" %}
          {% for item in configuration %}
          {% if item.type=="guides" and item.category=="configuration" and item.language=="en" -%}
            <li><a href="{{ site.baseurl }}{{ item.url }}">{{ item.title }}</a>
            {% if item.abstract != " " %}
            -  {{ item.abstract }}
            {% endif %}
            </li>
            {% endif %}
          {% endfor %}
      </ul>
    </details>  
    <details>
      <summary>
        <p style="display:inline">
          <a href="{{ site.baseurl }}/guides/infrastructure-management" class="text-black">Troubleshooting Guides</a>
        </p>
      </summary>
      <ul class="section-title">
          {% assign troubleshooting = site.pages | where: "category","troubleshooting" %}
          {% for item in troubleshooting %}
          {% if item.type=="guides" and item.category=="troubleshooting" and item.language=="en" -%}
            <li><a href="{{ site.baseurl }}{{ item.url }}">{{ item.title }}</a>
            {% if item.abstract != " " %}
              -  {{ item.abstract }}
            {% endif %}
            </li>
            {% endif %}
          {% endfor %}
      </ul>
    </details>
  </div>

  <!-- Extensions -->
  <div class="section">
    <a href="{{ site.baseurl }}/extensions">
        <div class="btn-primary">Integrations & Extensions</div>
    </a>
        <details>
      <summary>
        <p style="display:inline">
          <a href="{{ site.baseurl }}/extensions" class="text-black">Extensions</a>
        </p>
      </summary>
      <ul class="section-title">
        {% assign sorted_extensions = site.pages | where: "type","extensions" %}
        {% for item in sorted_extensions %}
        {% if item.type=="extensions" and item.language=="en" -%}
          <li><a href="{{ site.baseurl }}{{ item.url }}">{{ item.title }}</a>
          {% if item.abstract != " " %}
            - {{ item.abstract }}
          {% endif %}
          </li>
          {% endif %}
        {% endfor %}
      </ul>
    </details>
    <details>
      <summary>
        <p style="display:inline">
          <a href="{{ site.baseurl }}/extensibility/integrations" class="text-black">Integrations</a>
        </p>
      </summary>
      <ul class="section-title">
        {% assign sorted_ints = site.models | sort: "name" | alphabetical %}
        <ul><li>
        See all <a href="{{site.baseurl}}/extensibility/integrations" >{{ sorted_ints | size }} integations</a></li></ul>
        {% for item in sorted_ints %}
        {% if item.type=="extensibility" and item.category=="integration" and item.language=="en" -%}
          <li><a href="{{ site.baseurl }}{{ item.url }}">{{ item.title }}</a>
          {% if item.abstract != " " %}
            - {{ item.abstract }}
          {% endif %}
          </li>
          {% endif %}
        {% endfor %}
      </ul>
    </details>
  </div>
   
</div>
<div class="flex flex-col--2 container">

<!-- Contributing & Community -->
  <div class="section">
    <a href="{{ site.baseurl }}/project">
        <div class="btn-primary">Contributing & Community</div>
    </a>
    {% assign project = site.pages | sort: "name" | alphabetical %}
    <ul>
      {% for item in project %}
      {% if item.type=="project" and item.category!="contributing" and item.list=="include" and  item.list!="exclude" and item.language =="en" -%}
        <li><a href="{{ site.baseurl }}{{ item.url }}">{{ item.title }}</a>
        </li>
        {% endif %}
      {% endfor %}
    </ul>
      <!-- CONTRIBUTING -->
    <details>
      <summary>
        <p style="display:inline">
          <a href="{{ site.baseurl }}/project/contributing" class="text-black">Contributing</a>
        </p>
      </summary>
      <ul class="section-title">
       {% assign contributing = site.pages | where: "category","contributing" %}
          {% for item in contributing %}
          {% if item.category=="contributing" and item.language=="en" -%}
            <li><a href="{{ site.baseurl }}{{ item.url }}">{{ item.title }}</a>
            {% if item.abstract != " " %}
              - {{ item.abstract }}
            {% endif %}
            </li>
            {% endif %}
          {% endfor %}
      </ul>
    </details>
  </div>

    <!-- REFERENCE -->

  <div class="section">
  <a href="{{ site.baseurl }}/reference">
        <div class="btn-primary">Extensibility & Reference</div>
    </a>
      <!-- Reference -->
      <details>
      <summary>
        <p style="display:inline">
          <a href="{{ site.baseurl }}/reference" class="text-black">Reference</a>
        </p>
      </summary>
      <ul class="section-title">
        {% assign general_ref = site.pages | where: "type", "Reference" | sort: "title" %}
        {% for item in general_ref %}
          {% if item.language == "en" and item.list != "exclude" %}
            <li>
              <a href="{{ site.baseurl }}{{ item.url }}">{{ item.title }}</a>
            </li>
          {% endif %}
        {% endfor %}
      </ul>
    </details>
      <!-- Extensibility -->
      <details>
      <summary>
        <p style="display:inline">
          <a href="{{ site.baseurl }}/extensibility" class="text-black">Extensibility</a>
        </p>
      </summary>
      <ul class="section-title">
        {% assign extensibility_pages = site.pages | where: "type", "Extensibility" %}
        {% for item in extensibility_pages %}
          {% if item.list != "exclude" and item.language == "en" %}
            <li>
              <a href="{{ site.baseurl }}{{ item.url }}">{{ item.title }}</a>
              {% if item.abstract != " " %}
                - {{ item.abstract }}
              {% endif %}
            </li>
          {% endif %}
        {% endfor %}
      </ul>
    </details>
    </div>

</div>

<p width="100%">Follow on <a href="https://twitter.com/mesheryio">Twitter</a> or subscribe to our <a href="https://meshery.io/subscribe">newsletter</a> for the latest updates. Get support on our <a href="https://meshery.io/community#discussion-forums">forum</a>. Join our <a href="https://slack.meshery.io">Slack</a> to interact directly with other users and contributors.</p>
